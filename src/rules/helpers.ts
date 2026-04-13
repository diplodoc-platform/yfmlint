import type {MarkdownItToken, RuleOnError, RuleParams} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

export interface IncludeChainEntry {
    file: string;
    line: number;
}

export interface IncludeSourceInfo {
    lineNumber: number;
    sourceFile: string;
    sourceLineNumber: number;
    includeChain: IncludeChainEntry[];
}

interface TokenMeta {
    sourceFile?: string;
    includeChain?: IncludeChainEntry[];
}

export interface DirectiveMatch {
    directive: string;
    lineNumber: number;
    line: string;
}

export interface PairedDirectiveSpec {
    open: RegExp;
    close: RegExp;
}

/**
 * Validates and adjusts lineNumber to prevent markdownlint exception.
 * When include files are used, lineNumber might exceed the original file's line count.
 * Also returns the file path from markdown-it env if available.
 *
 * @param params - Rule parameters from markdownlint
 * @param rawLineNumber - The raw line number to validate
 * @returns Object containing validated line number and file path
 */
export function validateLineNumberAndGetFilePath(
    params: RuleParams,
    rawLineNumber: number | undefined,
): {lineNumber: number; filePath: string} {
    const linesCount = params.lines.length;
    const lineNumber = Math.min(Math.max(1, rawLineNumber || 1), linesCount);

    const env = (params.parsers.markdownit as {env?: {path?: string}}).env;
    const filePath = env?.path || params.name;

    return {lineNumber, filePath};
}

/**
 * Extracts include source metadata from token.meta (set by the includes plugin).
 * Returns null if the token is not from included content.
 *
 * @param params - Rule parameters from markdownlint
 * @param rawLineNumber - The raw line number from the token
 * @param token - The token to check for include metadata
 * @param parentToken - The parent token to check for include metadata
 * @returns Include source information or null if not from included content
 */
export function resolveIncludeSource(
    params: RuleParams,
    rawLineNumber: number | undefined,
    token?: MarkdownItToken,
    parentToken?: MarkdownItToken,
): IncludeSourceInfo | null {
    const sourceFile =
        (token as MarkdownItToken & {meta?: TokenMeta})?.meta?.sourceFile ||
        (parentToken as MarkdownItToken & {meta?: TokenMeta})?.meta?.sourceFile;
    const includeChain: IncludeChainEntry[] | undefined =
        (token as MarkdownItToken & {meta?: TokenMeta})?.meta?.includeChain ||
        (parentToken as MarkdownItToken & {meta?: TokenMeta})?.meta?.includeChain;

    if (!sourceFile || !includeChain?.length) {
        return null;
    }

    const mainFileLine = includeChain[0].line;
    const lineNumber = Math.min(Math.max(1, mainFileLine), params.lines.length);

    return {
        lineNumber,
        sourceFile,
        sourceLineNumber: rawLineNumber || 1,
        includeChain,
    };
}

/**
 * Formats include chain as: `main.md:3 → chapter.md:5 → details.md:10 ↛ broken.html`
 *
 * @param info - Include source information
 * @param brokenTarget - The broken target (e.g., href or src)
 * @returns Formatted include chain string
 */
export function formatIncludeChain(info: IncludeSourceInfo, brokenTarget: string): string {
    const parts = info.includeChain.map((entry) => `${entry.file}:${entry.line}`);
    parts.push(`${info.sourceFile}:${info.sourceLineNumber}`);
    return `${parts.join(' → ')} ↛ ${brokenTarget}`;
}

/**
 * Creates error context with optional file path information.
 *
 * @param baseContext - The base context string
 * @param filePath - The file path to include if different from paramsName
 * @param paramsName - The parameter name (original file path)
 * @returns Formatted context string
 */
export function createContextWithFileInfo(
    baseContext: string,
    filePath: string,
    paramsName: string,
): string {
    const parts = [baseContext];
    if (filePath !== paramsName) {
        parts.push(`File: ${filePath}`);
    }
    return parts.filter(Boolean).join('; ');
}

/**
 * Finds all inline tokens containing links and calls handler for each link.
 * Used by rules that validate links (YFM002, YFM003, YFM010).
 *
 * @param params - Rule parameters from markdownlint
 * @param ruleName - Name of the rule (e.g., 'YFM002') to check in link attributes
 * @param onError - Error callback function
 * @param handler - Optional custom handler for each link token
 * @returns {void}
 */
export function findLinksInInlineTokens(
    params: RuleParams,
    ruleName: string,
    onError: RuleOnError,
    handler?: (link: TokenWithAttrs, inline: MarkdownItToken) => void,
): void {
    params.parsers.markdownit.tokens
        .filter((token) => token.type === 'inline')
        .forEach((inline) => {
            inline.children
                ?.filter((child) => child && child.type === 'link_open')
                .forEach((link) => {
                    const linkToken = link as TokenWithAttrs;
                    if (linkToken.attrGet(ruleName)) {
                        if (handler) {
                            handler(linkToken, inline);
                        } else {
                            const rawLineNumber = link.lineNumber || inline.lineNumber;
                            const includeSource = resolveIncludeSource(
                                params,
                                rawLineNumber,
                                link,
                                inline,
                            );

                            if (includeSource) {
                                const href = linkToken.attrGet('href') || '';
                                const context = formatIncludeChain(includeSource, href);
                                onError({lineNumber: includeSource.lineNumber, context});
                            } else {
                                const {lineNumber, filePath} = validateLineNumberAndGetFilePath(
                                    params,
                                    rawLineNumber,
                                );
                                const context = createContextWithFileInfo(
                                    link.line || inline.line,
                                    filePath,
                                    params.name,
                                );
                                onError({lineNumber, context});
                            }
                        }
                    }
                });
        });
}

/**
 * Finds all inline tokens containing images and calls handler for each image.
 * Used by rules that validate images (YFM011).
 *
 * @param params - Rule parameters from markdownlint
 * @param ruleName - Name of the rule (e.g., 'YFM011') to check in image attributes
 * @param onError - Error callback function
 * @param handler - Optional custom handler for each image token
 * @returns {void}
 */
export function findImagesInInlineTokens(
    params: RuleParams,
    ruleName: string,
    onError: RuleOnError,
    handler?: (image: TokenWithAttrs, inline: MarkdownItToken) => void,
): void {
    params.parsers.markdownit.tokens
        .filter((token) => token.type === 'inline')
        .forEach((inline) => {
            inline.children
                ?.filter((child) => child && child.type === 'image')
                .forEach((image) => {
                    const imageToken = image as TokenWithAttrs;
                    if (imageToken.attrGet(ruleName)) {
                        if (handler) {
                            handler(imageToken, inline);
                        } else {
                            const rawLineNumber = image.lineNumber || inline.lineNumber;
                            const includeSource = resolveIncludeSource(
                                params,
                                rawLineNumber,
                                image,
                                inline,
                            );

                            if (includeSource) {
                                const src = imageToken.attrGet('src') || '';
                                const context = formatIncludeChain(includeSource, src);
                                onError({lineNumber: includeSource.lineNumber, context});
                            } else {
                                const {lineNumber, filePath} = validateLineNumberAndGetFilePath(
                                    params,
                                    rawLineNumber,
                                );
                                const context = createContextWithFileInfo(
                                    image.line || inline.line,
                                    filePath,
                                    params.name,
                                );
                                onError({lineNumber, context});
                            }
                        }
                    }
                });
        });
}

/**
 * Finds all __yfm_lint tokens and calls handler for each.
 * Used by rules that validate YFM-specific constructs (YFM004-YFM008).
 * These tokens are created by plugins from @diplodoc/transform when isLintRun = true.
 *
 * @param params - Rule parameters from markdownlint
 * @param ruleName - Name of the rule (e.g., 'YFM004') to check in token attributes
 * @param onError - Error callback function
 * @param handler - Optional custom handler for each token
 * @returns {void}
 */
export function findYfmLintTokens(
    params: RuleParams,
    ruleName: string,
    onError: RuleOnError,
    handler?: (token: TokenWithAttrs) => void,
): void {
    params.parsers.markdownit.tokens
        .filter((token) => token.type === '__yfm_lint')
        .forEach((token) => {
            const yfmLintToken = token as TokenWithAttrs;
            // Plugins from @diplodoc/transform set rule-specific attributes on __yfm_lint tokens
            // when they detect violations (e.g., YFM004, YFM005, YFM006, YFM007, YFM008)
            if (yfmLintToken.attrGet(ruleName)) {
                if (handler) {
                    handler(yfmLintToken);
                } else {
                    onError({
                        lineNumber: token.lineNumber,
                        context: token.line,
                    });
                }
            }
        });
}

/**
 * Returns a set of 1-based line numbers that should be skipped during directive scanning.
 * Lines inside fenced code blocks (```` ``` ```) and indented code blocks are excluded
 * to prevent false positives on code examples that contain YFM syntax.
 *
 * @param params - Rule parameters from markdownlint
 * @returns Set of line numbers (1-based) that belong to code blocks
 */
export function getIgnoredLineNumbers(params: RuleParams): Set<number> {
    const ignored = new Set<number>();

    params.parsers.markdownit.tokens.forEach((token) => {
        if ((token.type === 'fence' || token.type === 'code_block') && token.map) {
            const [start, end] = token.map;

            for (let line = start; line < end; line++) {
                ignored.add(line + 1);
            }
        }
    });

    return ignored;
}

/**
 * Replaces inline code spans (backtick-delimited) with spaces of the same length.
 * Preserves character positions so that match offsets remain accurate.
 * Handles single and multi-backtick spans (e.g., `` `code` `` and ` ``code`` `).
 *
 * @param line - A single line of markdown text
 * @returns The line with all inline code spans replaced by spaces
 */
export function stripInlineCode(line: string): string {
    return line.replace(/(`+).*?\1/g, (m) => ' '.repeat(m.length));
}

/**
 * Finds all YFM/Liquid directive matches (`{% ... %}`) in the document lines,
 * skipping lines inside code blocks and inline code spans.
 *
 * @param params - Rule parameters from markdownlint
 * @returns Array of directive matches with their directive content, line number, and original line text
 */
export function findDirectiveMatches(params: RuleParams): DirectiveMatch[] {
    const ignoredLines = getIgnoredLineNumbers(params);
    const directiveRe = /(^|[^\\]){%\s*([^%]+?)\s*%}/g;
    const matches: DirectiveMatch[] = [];

    params.lines.forEach((line, index) => {
        const lineNumber = index + 1;

        if (ignoredLines.has(lineNumber)) {
            return;
        }

        const stripped = stripInlineCode(line);
        let match: RegExpExecArray | null;
        const localRe = new RegExp(directiveRe.source, 'g');

        while ((match = localRe.exec(stripped)) !== null) {
            matches.push({
                directive: match[2].trim(),
                lineNumber,
                line,
            });
        }
    });

    return matches;
}

/**
 * Validates that opening and closing directives are properly paired using a stack.
 * Reports two types of issues:
 * - Unexpected closing directive (closing without a matching opening)
 * - Unclosed opening directive (opening without a matching closing)
 *
 * @param params - Rule parameters from markdownlint
 * @param spec - Pair specification with `open` and `close` regexes tested against the directive content
 * @returns Array of issues, each with a line number, context (original line), and detail message
 */
export function findPairedDirectiveIssues(
    params: RuleParams,
    spec: PairedDirectiveSpec,
): Array<{lineNumber: number; context: string; detail: string}> {
    const issues: Array<{lineNumber: number; context: string; detail: string}> = [];
    const stack: DirectiveMatch[] = [];

    for (const match of findDirectiveMatches(params)) {
        if (spec.open.test(match.directive)) {
            stack.push(match);
            continue;
        }

        if (spec.close.test(match.directive)) {
            const open = stack.pop();

            if (!open) {
                issues.push({
                    lineNumber: match.lineNumber,
                    context: match.line,
                    detail: `Unexpected closing directive '{% ${match.directive} %}'`,
                });
            }
        }
    }

    stack.forEach((unclosed) => {
        issues.push({
            lineNumber: unclosed.lineNumber,
            context: unclosed.line,
            detail: `Directive '{% ${unclosed.directive} %}' must be closed`,
        });
    });

    return issues;
}

interface StackEntry {
    match: DirectiveMatch;
    specIndex: number;
}

/**
 * Detects interleaved (improperly nested) directives using a unified stack across all specs.
 *
 * Example of interleaved directives:
 *   {% note info %}
 *   {% list tabs %}
 *   {% endnote %}      ← closes note, but tabs is still open inside
 *   {% endlist %}
 *
 * Per-spec stacks cannot detect this because each spec closes cleanly in isolation.
 * This function uses a single stack for all directive types and reports when a closing
 * directive skips over unclosed directives of a different type.
 *
 * @param params - Rule parameters from markdownlint
 * @param specs - Array of paired directive specifications
 * @returns Array of issues with line number, context, and detail message
 */
export function findInterleavedDirectiveIssues(
    params: RuleParams,
    specs: PairedDirectiveSpec[],
): Array<{lineNumber: number; context: string; detail: string}> {
    const issues: Array<{lineNumber: number; context: string; detail: string}> = [];
    const stack: StackEntry[] = [];

    for (const match of findDirectiveMatches(params)) {
        const openIndex = specs.findIndex((s) => s.open.test(match.directive));

        if (openIndex !== -1) {
            stack.push({match, specIndex: openIndex});
            continue;
        }

        const closeIndex = specs.findIndex((s) => s.close.test(match.directive));

        if (closeIndex === -1) {
            continue;
        }

        let found = -1;
        for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].specIndex === closeIndex) {
                found = i;
                break;
            }
        }

        if (found === -1) {
            continue;
        }

        for (let i = stack.length - 1; i > found; i--) {
            const interleaved = stack[i];
            issues.push({
                lineNumber: match.lineNumber,
                context: match.line,
                detail:
                    `Interleaved directives: '{% ${match.directive} %}' closes before ` +
                    `'{% ${interleaved.match.directive} %}' (line ${interleaved.match.lineNumber}) is closed`,
            });
        }

        stack.splice(found);
    }

    return issues;
}
