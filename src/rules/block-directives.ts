import type {MarkdownIt as MarkdownItInstance} from 'markdown-it';
import type {MarkdownItToken, RuleOnError, RuleParams} from 'markdownlint';

import MarkdownIt from 'markdown-it';
import {transform as cut} from '@diplodoc/cut-extension/plugin';
import {
    directiveParser,
    registerContainerDirective,
    tokenizeBlockContent,
} from '@diplodoc/directive';
import {createNotesPlugin} from '@diplodoc/notes-extension/plugin';
import {transform as tabs} from '@diplodoc/tabs-extension/plugin';

import {resolveIncludeSource, validateLineNumberAndGetFilePath} from './helpers';

type Owner = 'cut' | 'note' | 'tabs';
type Code = 'YFM005' | 'YFM020';

type Issue = Readonly<{
    kind: 'diagnostic';
    code: Code;
    owner: Owner;
    sourceLineNumber: number;
    context: string;
    reason: string;
}>;

type ObservationFailure = Readonly<{
    kind: 'failure';
    owner: Owner;
    sourceLineNumber: number;
    context: string;
    reason: string;
}>;

type Observation = Issue | ObservationFailure;

const issuesKey = Symbol('yfmlint.block-directives');

interface Carrier {
    readonly [issuesKey]?: readonly Observation[];
}

interface CaptureToken extends Carrier {
    type: string;
    content: string;
    map: readonly number[] | null;
}

interface CaptureState {
    src: string;
    tokens: CaptureToken[];
}

interface Candidate {
    token: CaptureToken;
    owner: Owner;
    sourceLineNumber: number;
    context: string;
}

interface OwnerDiagnostic {
    owner: Owner;
    line: number;
    reason: string;
}

function findCandidates(state: CaptureState): Candidate[] {
    const lines = state.src.split('\n');
    const candidates: Candidate[] = [];

    state.tokens.forEach((token, index) => {
        const inline = state.tokens[index + 1];
        const startLine = token.map?.[0];

        if (
            token.type !== 'paragraph_open' ||
            inline?.type !== 'inline' ||
            !Number.isInteger(startLine) ||
            startLine === undefined ||
            startLine < 0 ||
            startLine >= lines.length
        ) {
            return;
        }

        // Identify only the family on an original native fallback paragraph.
        // Parameter and closing syntax belong exclusively to the public parser.
        const family = /^:{3,}[ \t]*(cut|note|tabs)(?=\s|[[{(]|$)/i
            .exec(inline.content)?.[1]
            .toLowerCase();

        if (family !== 'cut' && family !== 'note' && family !== 'tabs') {
            return;
        }

        candidates.push({
            token,
            owner: family,
            sourceLineNumber: startLine + 1,
            context: lines[startLine],
        });
    });

    return candidates;
}

function observe(source: string): {
    closed: Array<{owner: Owner; line: number}>;
    diagnostics: OwnerDiagnostic[];
} {
    const closed: Array<{owner: Owner; line: number}> = [];
    const registrar = new MarkdownIt({html: true});
    directiveParser()(registrar);

    for (const owner of ['cut', 'note', 'tabs'] as const) {
        registerContainerDirective(
            registrar,
            owner,
            (state, params) => {
                closed.push({owner, line: params.startLine + 1});
                tokenizeBlockContent(state, params.content, 'yfmlint-block-observation');

                return true;
            },
            {onConflict: 'error'},
        );
    }

    registrar.core.ruler.enableOnly(['normalize', 'block']);
    registrar.parse(source, {});

    const diagnostics: OwnerDiagnostic[] = [];
    const validator = new MarkdownIt({html: true});
    const quietLog = {warn() {}, error() {}};
    let nextID = 0;

    cut({
        runtime: false,
        bundle: false,
        directiveSyntax: 'enabled',
        onDiagnostic: (item) => diagnostics.push({owner: 'cut', ...item}),
    })(validator);
    createNotesPlugin(undefined, undefined, {
        directiveSyntax: 'enabled',
        onDiagnostic: (item) => diagnostics.push({owner: 'note', ...item}),
    })(validator, {log: quietLog});
    tabs({
        bundle: false,
        directiveSyntax: 'enabled',
        features: {
            enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true},
        },
        onDiagnostic: (item) => diagnostics.push({owner: 'tabs', ...item}),
    })(validator, {generateID: () => `yfmlint-validation-${++nextID}`});
    validator.parse(source, {});

    return {closed, diagnostics};
}

/**
 * Captures source-local refusals before owners/includes and markdownlint rewrite tokens.
 * Private native parsers never receive caller callbacks or rendering options.
 * @param md - The actual lint parser, including native 13 hosts.
 * @returns Nothing.
 */
export function captureBlockDirectives(md: MarkdownItInstance): void {
    md.core.ruler.after('block', 'yfmlint_block_directives', (state) => {
        const candidates = findCandidates(state);

        if (!candidates.length) {
            return;
        }

        let observation: ReturnType<typeof observe>;

        try {
            observation = observe(state.src);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);

            for (const {token, owner, sourceLineNumber, context} of candidates) {
                const failure: ObservationFailure = Object.freeze({
                    kind: 'failure',
                    owner,
                    sourceLineNumber,
                    context,
                    reason,
                });

                Object.defineProperty(token, issuesKey, {value: Object.freeze([failure])});
            }

            return;
        }

        for (const candidate of candidates) {
            const {token, owner, sourceLineNumber, context} = candidate;
            const diagnostic = observation.diagnostics.find(
                (item) => item.owner === owner && item.line === sourceLineNumber,
            );
            const closed = observation.closed.some(
                (item) => item.owner === owner && item.line === sourceLineNumber,
            );

            if (token[issuesKey] || (!diagnostic && closed)) {
                continue;
            }

            const issue: Issue = Object.freeze({
                kind: 'diagnostic',
                code: diagnostic ? 'YFM020' : 'YFM005',
                owner,
                sourceLineNumber,
                context,
                reason: diagnostic?.reason || `Directive ':::${owner}' must be closed`,
            });

            Object.defineProperty(token, issuesKey, {value: Object.freeze([issue])});
        }
    });
}

/**
 * Reports immutable carriers after the host copies/includes and freezes original tokens.
 * Captured local lines refer to parser input after existing host preprocessing.
 * @param params - The final markdownlint parameters.
 * @param onError - The current lint rule callback.
 * @param code - The existing rule receiving these observations.
 * @returns Nothing.
 */
export function reportBlockDirectives(params: RuleParams, onError: RuleOnError, code: Code): void {
    params.parsers.markdownit.tokens.forEach((token, index) => {
        const carrier: Carrier & MarkdownItToken = token;

        for (const issue of carrier[issuesKey] || []) {
            if (issue.kind === 'failure') {
                throw new Error(`YFM block directive validation failed: ${issue.reason}`);
            }

            if (issue.code !== code) {
                continue;
            }

            const includeSource = resolveIncludeSource(
                params,
                issue.sourceLineNumber,
                token,
                params.parsers.markdownit.tokens[index + 1],
            );
            const lineNumber = includeSource
                ? includeSource.lineNumber
                : validateLineNumberAndGetFilePath(params, issue.sourceLineNumber).lineNumber;
            const chain = includeSource?.includeChain
                .map((entry) => `${entry.file}:${entry.line}`)
                .join(' → ');
            const context = includeSource
                ? `${chain} → ${includeSource.sourceFile} (processed input line ${issue.sourceLineNumber}): ${issue.context}`
                : issue.context;

            onError({lineNumber, context, detail: issue.reason});
        }
    });
}
