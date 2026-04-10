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

export function stripInlineCode(line: string): string {
    return line.replace(/(`+).*?\1/g, (m) => ' '.repeat(m.length));
}

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
