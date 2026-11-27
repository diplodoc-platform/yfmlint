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

    const [matchedHeader] = match;
    let headerEnd = matchedHeader.length;
    if (!/[\r\n]$/.test(matchedHeader)) {
        // Assign the rest of the closing line to the header so diagnostics keep their line offsets.
        const closingLineEnd = /^[ \t]*(?:\r\n?|\n|$)/.exec(source.slice(headerEnd));
        headerEnd += closingLineEnd?.[0].length ?? 0;
    }

    // Upstream scans the header for inline configuration before removing it.
    // Header text must stay visible to rules such as MD025, but its comments
    // should not enable or suppress rules in the document body.
    const header = source.slice(0, headerEnd).replace(inlineConfigPrefix, '<!- ');
    const normalizedHeader = header.replace(/\r\n?/g, '\n');

    return {
        content:
            content.slice(0, content.length - source.length) + header + source.slice(headerEnd),
        frontMatter: new RegExp('^' + escapeRegExp(normalizedHeader)),
    };
}

function copyMetadata(tokens: Token[]) {
    for (const token of tokens) {
        const metadata = token.meta;
        if (metadata && typeof metadata === 'object' && !Object.isFrozen(metadata)) {
            const prototype = Object.getPrototypeOf(metadata) as object | null;
            const copy: object = Array.isArray(metadata) ? [] : Object.create(prototype);
            Object.defineProperties(copy, Object.getOwnPropertyDescriptors(metadata));

            // Give class getters their original receiver, including its private fields.
            token.meta = new Proxy(copy, {
                get(target, key) {
                    return Reflect.get(target, key, metadata);
                },
            }) as Token['meta'];
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
