import type {MarkdownIt, Token} from 'markdown-it';
import type {Configuration} from 'markdownlint';

import escapeRegExp from 'lodash/escapeRegExp';

const inlineConfigPrefix = /<!--(?=\s*markdownlint-)/gi;
const frontMatterTitleRule =
    /^(?:MD001|heading-increment|MD025|single-title|single-h1|MD041|first-line-heading|first-line-h1|headings)$/i;

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
    const originalHeader = source.slice(0, headerEnd);
    const header = originalHeader.replace(inlineConfigPrefix, '<!- ');
    const normalizedHeader = header.replace(/\r\n?/g, '\n');

    return {
        content:
            content.slice(0, content.length - source.length) + header + source.slice(headerEnd),
        frontMatter: new RegExp('^' + escapeRegExp(normalizedHeader)),
        originalHeaderLines:
            header === originalHeader
                ? undefined
                : originalHeader.replace(/(?:\r\n?|\n)$/, '').split(/\r\n?|\n/),
    };
}

/**
 * Evaluate custom title patterns against the original YAML when inline configuration was masked.
 * @param config - Caller or inline markdownlint configuration.
 * @param lines - Original front matter lines.
 * @returns Configuration with equivalent title checks for this document.
 */
export function preserveFrontMatterTitles(config: Configuration, lines: string[]): Configuration {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return config;
    }

    const adapted = {...config};
    for (const [rule, settings] of Object.entries(config)) {
        if (!frontMatterTitleRule.test(rule) || !settings || typeof settings !== 'object') {
            continue;
        }

        const {front_matter_title: pattern} = settings as {front_matter_title?: unknown};
        if (!pattern || !Object.prototype.hasOwnProperty.call(settings, 'front_matter_title')) {
            continue;
        }

        try {
            const title = new RegExp(String(pattern), 'i');
            const hasTitle = lines.some((line) => title.test(line));

            adapted[rule] = {...settings, front_matter_title: hasTitle ? '^' : '(?!)'};
        } catch (error) {
            // Let the lint engine report invalid patterns as rule failures.
            if (!(error instanceof SyntaxError || error instanceof TypeError)) {
                throw error;
            }
        }
    }

    return adapted;
}

function copyMetadata(metadata: Token['meta']): Token['meta'] {
    if (!metadata || typeof metadata !== 'object' || Object.isFrozen(metadata)) {
        return metadata;
    }

    const prototype = Object.getPrototypeOf(metadata) as object | null;
    const copy: object = Array.isArray(metadata) ? [] : Object.create(prototype);
    Object.defineProperties(copy, Object.getOwnPropertyDescriptors(metadata));

    // Give class getters their original receiver, including its private fields.
    return new Proxy(copy, {
        get(target, key) {
            return Reflect.get(target, key, metadata);
        },
    }) as Token['meta'];
}

function copyLintTokens(tokens: Token[]): Token[] {
    let copies = tokens;
    tokens.forEach((token, index) => {
        const meta = copyMetadata(token.meta);
        const children = token.children && copyLintTokens(token.children);
        if (meta === token.meta && children === token.children) {
            return;
        }

        // Keep prototypes and hidden plugin annotations on copies for the lint engine.
        const descriptors = Object.getOwnPropertyDescriptors(token);
        descriptors.meta.value = meta;
        descriptors.children.value = children;
        if (token.attrs) {
            descriptors.attrs.value = token.attrs.map(([name, value]) => [name, value]);
        }
        if (token.map) {
            descriptors.map.value = [...token.map];
        }

        if (copies === tokens) {
            copies = tokens.slice();
        }
        copies[index] = Object.create(Object.getPrototypeOf(token), descriptors) as Token;
    });

    return copies;
}

/**
 * Keep plugin-owned metadata writable while upstream freezes the lint token view.
 * @param md - Parser with the caller's plugins already installed.
 * @returns Nothing.
 */
export function protectPluginMetadata(md: MarkdownIt): void {
    const parse = md.parse.bind(md);
    md.parse = (source, env) => copyLintTokens(parse(source, env));
}
