import type {MarkdownItToken, RuleOnError, RuleParams} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

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
                    const linkToken = link as unknown as TokenWithAttrs;
                    // Plugins from @diplodoc/transform set rule-specific attributes on links
                    // when they detect violations (e.g., YFM002, YFM003, YFM010)
                    if (linkToken.attrGet(ruleName)) {
                        if (handler) {
                            handler(linkToken, inline);
                        } else {
                            onError({
                                lineNumber: link.lineNumber || inline.lineNumber,
                                context: link.line || inline.line,
                            });
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
                    const imageToken = image as unknown as TokenWithAttrs;
                    // Plugins from @diplodoc/transform set rule-specific attributes on images
                    // when they detect violations (e.g., YFM011)
                    if (imageToken.attrGet(ruleName)) {
                        if (handler) {
                            handler(imageToken, inline);
                        } else {
                            onError({
                                lineNumber: image.lineNumber || inline.lineNumber,
                                context: image.line || inline.line,
                            });
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
            const yfmLintToken = token as unknown as TokenWithAttrs;
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
