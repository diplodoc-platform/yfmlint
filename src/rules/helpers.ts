import type {MarkdownItToken, RuleOnError, RuleParams} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

/**
 * Validates and adjusts lineNumber to prevent markdownlint exception.
 * When include files are used, lineNumber might exceed the original file's line count.
 * Also returns the file path from markdown-it env if available.
 */
export function validateLineNumberAndGetFilePath(
    params: RuleParams,
    rawLineNumber: number | undefined,
): {lineNumber: number; filePath: string} {
    // Validate lineNumber to prevent markdownlint exception
    const linesCount = params.lines.length;
    const lineNumber = Math.min(Math.max(1, rawLineNumber || 1), linesCount);

    // Get the file path from markdown-it env if available
    // This helps identify which include file contains the broken link
    const env = (params.parsers.markdownit as any).env;
    const filePath = env?.path || params.name;

    return {lineNumber, filePath};
}

/**
 * Creates error context with optional file path information.
 */
export function createContextWithFileInfo(
    baseContext: string,
    filePath: string,
    paramsName: string,
): string {
    const parts = [baseContext];
    if (filePath !== paramsName) {
        parts.push(`File: ${filePath}`); // Show include file path if different
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
                    const linkToken = link as unknown as TokenWithAttrs;
                    // Plugins from @diplodoc/transform set rule-specific attributes on links
                    // when they detect violations (e.g., YFM002, YFM003, YFM010)
                    if (linkToken.attrGet(ruleName)) {
                        if (handler) {
                            handler(linkToken, inline);
                        } else {
                            const rawLineNumber = link.lineNumber || inline.lineNumber;
                            const {lineNumber, filePath} = validateLineNumberAndGetFilePath(
                                params,
                                rawLineNumber,
                            );
                            const context = createContextWithFileInfo(
                                link.line || inline.line,
                                filePath,
                                params.name,
                            );

                            onError({
                                lineNumber,
                                context,
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
                            const rawLineNumber = image.lineNumber || inline.lineNumber;
                            const {lineNumber, filePath} = validateLineNumberAndGetFilePath(
                                params,
                                rawLineNumber,
                            );
                            const context = createContextWithFileInfo(
                                image.line || inline.line,
                                filePath,
                                params.name,
                            );

                            onError({
                                lineNumber,
                                context,
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
