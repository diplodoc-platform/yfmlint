import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

import {getIgnoredLineNumbers} from './helpers';

const VISIBILITY_CANDIDATE_RE = /^[ \t]*:{3,}[ \t]*visibility(?:[ \t]|$)/i;
const VISIBILITY_OPEN_RE =
    /^[ \t]*:{3,}[ \t]*visibility[ \t]+(human|agent)[ \t]*(?::{2,})?[ \t]*$/i;
const DETAIL = 'Expected: :::visibility human or :::visibility agent';

type MarkdownItParser = {
    tokens: TokenWithAttrs[];
};

function reportLine(
    onError: Parameters<NonNullable<Rule['function']>>[1],
    lines: readonly string[],
    lineNumber: number,
): void {
    onError({
        lineNumber,
        detail: DETAIL,
        context: lines[lineNumber - 1],
    });
}

/**
 * YFM023 - Invalid visibility audience.
 *
 * The transform visibility plugin marks directives recognized by the renderer. The rule validates
 * those tokens and reports opener-like lines that failed to become a directive, keeping lint and
 * rendering semantics aligned.
 */
export const yfm023: Rule = {
    names: ['YFM023', 'invalid-visibility-audience'],
    description: 'Visibility audience is missing or invalid',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM023(params, onError) {
        if (!params.config) {
            return;
        }

        const parser = params.parsers.markdownit as MarkdownItParser;
        const ignoredLines = getIgnoredLineNumbers(params);

        const usesVisibilityParser = parser.tokens.some(
            (token) => token.type === '__yfm_lint' && token.attrGet('visibility-parser') === 'true',
        );

        if (!usesVisibilityParser) {
            params.lines.forEach((line, index) => {
                const lineNumber = index + 1;
                if (
                    !ignoredLines.has(lineNumber) &&
                    VISIBILITY_CANDIDATE_RE.test(line) &&
                    !VISIBILITY_OPEN_RE.test(line)
                ) {
                    reportLine(onError, params.lines, lineNumber);
                }
            });
            return;
        }

        const visibilityTokens = parser.tokens.filter(
            (token) =>
                token.type === '__yfm_lint' && token.attrGet('visibility-directive') === 'true',
        );
        const recognizedLines = new Set<number>();

        for (const token of visibilityTokens) {
            const lineNumber = token.map?.[0] !== undefined ? token.map[0] + 1 : token.lineNumber;
            if (!lineNumber) {
                continue;
            }

            recognizedLines.add(lineNumber);
            if (token.attrGet('YFM023') === 'invalid') {
                reportLine(onError, params.lines, lineNumber);
            }
        }

        params.lines.forEach((line, index) => {
            const lineNumber = index + 1;
            if (
                !ignoredLines.has(lineNumber) &&
                VISIBILITY_CANDIDATE_RE.test(line) &&
                !recognizedLines.has(lineNumber)
            ) {
                reportLine(onError, params.lines, lineNumber);
            }
        });
    },
};
