import type {MarkdownIt, Token} from 'markdown-it';

import escapeRegExp from 'lodash/escapeRegExp';

const inlineConfigPrefix = /<!--(?=\s*markdownlint-)/gi;

/**
 * Evaluate the caller's JavaScript pattern before markdownlint translates
 * its front-matter option to RE2. Pass an escaped match so standard rules can
 * still see the header and retain the original document line numbers.
 * @param content - Document before markdownlint normalizes line endings.
 * @param pattern - Optional caller-provided front-matter matcher.
 * @returns Input and a pattern supported by the lint engine.
 */
export function prepareFrontMatter(content: string, pattern: RegExp | null) {
    if (!pattern) {
        return {content, frontMatter: null};
    }

    const source = content.replace(/^\uFEFF/, '');
    const match = source.match(pattern);
    if (!match?.[0] || match.index) {
        return {content, frontMatter: null};
    }

    // Upstream scans the header for inline configuration before removing it.
    // Header text must stay visible to rules such as MD025, but its comments
    // should not enable or suppress rules in the document body.
    const header = source.slice(0, match[0].length).replace(inlineConfigPrefix, '<!- ');
    const normalizedHeader = header.replace(/\r\n?/g, '\n');

    return {
        content:
            content.slice(0, content.length - source.length) +
            normalizedHeader +
            source.slice(match[0].length),
        frontMatter: new RegExp('^' + escapeRegExp(normalizedHeader)),
    };
}

function copyMetadata(tokens: Token[]) {
    for (const token of tokens) {
        if (token.meta && typeof token.meta === 'object' && !Object.isFrozen(token.meta)) {
            const prototype = Object.getPrototypeOf(token.meta) as object | null;
            const copy: object = Array.isArray(token.meta) ? [] : Object.create(prototype);
            token.meta = Object.defineProperties(
                copy,
                Object.getOwnPropertyDescriptors(token.meta),
            ) as Token['meta'];
        }

        if (token.children) {
            copyMetadata(token.children);
        }
    }
}

/**
 * Keep plugin-owned metadata writable while upstream freezes the lint token view.
 * @param md - Parser with the caller's plugins already installed.
 * @returns Nothing.
 */
export function protectPluginMetadata(md: MarkdownIt): void {
    const parse = md.parse.bind(md);
    md.parse = (source, env) => {
        const tokens = parse(source, env);
        copyMetadata(tokens);

        return tokens;
    };
}
