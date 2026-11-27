import type {MarkdownIt, Token} from 'markdown-it';
import type {Configuration} from 'markdownlint';

import escapeRegExp from 'lodash/escapeRegExp';
import {frontMatterHasTitle, isBlankLine} from 'markdownlint/helpers';

const inlineConfigPrefix = /(<!--\s*)markdownlint-/gi;
const scopedInlineConfig =
    /<!--\s*markdownlint-(?:disable(?:-next-line|-line)?|restore)(?=\s|-->)/i;
const fileInlineConfig = /<!--\s*markdownlint-(?:disable|enable)-file(?=\s|-->)/i;
const restoreInlineConfig = /<!--\s*markdownlint-restore(?=\s|-->)/i;
const frontMatterTitleRule =
    /^(?:MD001|heading-increment|MD025|single-title|single-h1|MD041|first-line-heading|first-line-h1|headings)$/i;
const maxFrontMatterLength = 1024;

function maskFrontMatterConfig(header: string, body: string): string {
    // Keep the HTML opener so MD022 still recognizes YAML comments as blank lines.
    const masked = header.replace(inlineConfigPrefix, '$1markdownlinx-');
    // Configure-file scans across line boundaries, including a comment opener in the header.
    return /^\s*markdownlint-configure-file(?=\s|-->)/i.test(body)
        ? masked.replace(/<!--(?=\s*$)/, '<!--x')
        : masked;
}

function compactFrontMatter(header: string, endsAtDocumentEnd: boolean): string {
    if (header.length <= maxFrontMatterLength) {
        return header;
    }

    const segments = header.split(/(\r\n?|\n)/);
    // Keep the original separators, including a CR that the caller's match split from its LF.
    const end = endsAtDocumentEnd ? segments.length : segments.length - 1;
    for (let index = 0; index < end; index += 2) {
        const line = segments[index];
        // Leave comment-bearing lines intact to avoid running the upstream comment-removal loop
        // on large lines that MD022 may never inspect.
        if (line.includes('<!--') || line.includes('-->')) {
            continue;
        }

        if (frontMatterHasTitle([line])) {
            segments[index] = 'title:';
        } else {
            segments[index] = isBlankLine(line) ? ' ' : '-';
        }
    }

    return segments.join('');
}

function excludeFrontMatterFromRules(header: string, body: string): string {
    if (!scopedInlineConfig.test(body)) {
        return header;
    }

    const segments = header.split(/(\r\n?|\n)/);
    // The header ends in a line break, so the last content segment precedes the final separator.
    const closingLine = segments.length - 3;
    const disableLine = '<!-- markdownlint-disable-line -->';
    const hasFileConfig = fileInlineConfig.test(body);
    if (hasFileConfig && restoreInlineConfig.test(body)) {
        // A body restore can refer to the initial state before file directives. Leave that
        // snapshot intact and disable only the YAML lines in this case.
        for (let index = 0; index <= closingLine; index += 2) {
            segments[index] += disableLine;
        }
    } else {
        if (hasFileConfig) {
            segments[0] += '<!-- markdownlint-capture -->';
        }
        segments[0] += '<!-- markdownlint-disable -->';
        segments[closingLine] += '<!-- markdownlint-restore -->' + disableLine;
    }

    return segments.join('');
}

function markFrontMatterEnd(header: string): string | undefined {
    const lineEnding = /(?:\r\n?|\n)$/.exec(header)?.[0];
    if (!lineEnding || header.includes('\t')) {
        return undefined;
    }

    // A trailing tab keeps the closing line's blankness and title detection intact.
    return header.slice(0, -lineEnding.length) + '\t' + lineEnding;
}

function matchFrontMatterLines(header: string): RegExp {
    const lines = header.split(/\r\n?|\n/);
    const completeLines = lines.length - 1;
    const partialLine = lines[completeLines];
    const linePattern = '(?:[^\\n]*\\n)';
    // RE2 limits a counted repetition to 1000. Match any partial final line literally.
    const limit = 1000;
    const remaining = completeLines % limit;
    const chunks = (linePattern + `{${limit}}`).repeat(Math.floor(completeLines / limit));
    const tail = remaining ? linePattern + `{${remaining}}` : '';

    return new RegExp('^' + chunks + tail + escapeRegExp(partialLine));
}

/**
 * Evaluate the caller's JavaScript pattern before markdownlint translates
 * its front-matter option to RE2. Keep the header's line count, title and
 * blank-line semantics while avoiding a second scan of long metadata lines.
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

    const originalHeader = source.slice(0, headerEnd);
    const body = source.slice(headerEnd);
    const endsAtDocumentEnd = body.length === 0;

    const maskedHeader = maskFrontMatterConfig(originalHeader, body);
    let header = compactFrontMatter(maskedHeader, endsAtDocumentEnd);
    let frontMatter = /^[\s\S]*$/;
    if (!endsAtDocumentEnd) {
        // A partial closing line already counts as one YAML line in diagnostics. Give its
        // Markdown suffix a separate line in the inline-directive scan as well.
        if (!/[\r\n]$/.test(header)) {
            header += '\n';
        }

        // Upstream computes active rules before removing YAML. Suppress those lines when
        // body directives can otherwise disable a rule everywhere it would actually run.
        header = excludeFrontMatterFromRules(header, body);
        const markedHeader = header === maskedHeader ? undefined : markFrontMatterEnd(header);
        if (markedHeader) {
            // Use the unique tab instead of compiling a repetition for every header line.
            header = markedHeader;
            frontMatter = /^[^\t]*\t\n/;
        } else {
            frontMatter = matchFrontMatterLines(header);
        }
    }

    return {
        content: content.slice(0, content.length - source.length) + header + body,
        frontMatter,
        originalHeaderLines:
            header === originalHeader
                ? undefined
                : originalHeader.replace(/(?:\r\n?|\n)$/, '').split(/\r\n?|\n/),
    };
}

/**
 * Evaluate custom title patterns against the original YAML when the lint header was rewritten.
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

        adapted[rule] = {
            ...settings,
            // Upstream coerces the effective setting to a string inside the rule's error handler.
            front_matter_title: {
                toString() {
                    const title = new RegExp(String(pattern), 'i');

                    return lines.some((line) => title.test(line)) ? '^' : '(?!)';
                },
            },
        };
    }

    return adapted;
}

function copyMetadata(metadata: Token['meta']): Token['meta'] {
    if (!metadata || typeof metadata !== 'object' || Object.isFrozen(metadata)) {
        return metadata;
    }

    const prototype = Object.getPrototypeOf(metadata) as object | null;
    const copy: object = Array.isArray(metadata) ? [] : Object.create(prototype);
    let needsReceiver = prototype !== Object.prototype && prototype !== null;
    for (const key of Reflect.ownKeys(metadata)) {
        const descriptor = Object.getOwnPropertyDescriptor(metadata, key);
        if (descriptor) {
            defineCopyProperty(copy, key, descriptor);
            needsReceiver ||= Boolean(descriptor.get);
        }
    }

    if (!needsReceiver) {
        return copy as Token['meta'];
    }

    // Give class getters their original receiver, including its private fields.
    return new Proxy(copy, {
        get(target, key) {
            return Reflect.get(target, key, metadata);
        },
    }) as Token['meta'];
}

function defineCopyProperty(copy: object, key: PropertyKey, descriptor: PropertyDescriptor): void {
    if (descriptor.enumerable && descriptor.writable && descriptor.configurable && !(key in copy)) {
        Reflect.set(copy, key, descriptor.value);
    } else {
        Object.defineProperty(copy, key, descriptor);
    }
}

function copyToken(token: Token, meta: Token['meta'], children: Token['children']): Token {
    const copy = Object.create(Object.getPrototypeOf(token)) as Token;
    let hasOwnMeta = false;

    // Keep prototypes and hidden plugin annotations on copies for the lint engine.
    // Native token fields are writable data properties and can use the cheaper assignment path.
    for (const key of Reflect.ownKeys(token)) {
        const descriptor = Object.getOwnPropertyDescriptor(token, key);
        if (!descriptor) {
            continue;
        }

        if (key === 'meta') {
            hasOwnMeta = true;
            if ('value' in descriptor) {
                descriptor.value = meta;
            } else if (descriptor.get) {
                descriptor.get = () => meta;
            }
        } else if ('value' in descriptor) {
            switch (key) {
                case 'children':
                    descriptor.value = children;
                    break;
                case 'attrs':
                    descriptor.value =
                        token.attrs && token.attrs.map(([name, value]) => [name, value]);
                    break;
                case 'map':
                    descriptor.value = token.map && [...token.map];
                    break;
            }
        }

        defineCopyProperty(copy, key, descriptor);
    }

    if (!hasOwnMeta && 'meta' in token) {
        // Prevent an inherited getter from returning the plugin's metadata to markdownlint.
        Object.defineProperty(copy, 'meta', {get: () => meta});
    }

    return copy;
}

function copyLintTokens(tokens: Token[]): Token[] {
    let copies = tokens;
    tokens.forEach((token, index) => {
        const originalMeta = token.meta;
        const meta = copyMetadata(originalMeta);
        const children = token.children && copyLintTokens(token.children);
        if (meta === originalMeta && children === token.children) {
            return;
        }

        if (copies === tokens) {
            copies = tokens.slice();
        }
        copies[index] = copyToken(token, meta, children);
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
    let parsing = false;
    md.parse = (source, env) => {
        // Nested parses belong to plugins. Only upstream freezes the outer result.
        if (parsing) {
            return parse(source, env);
        }

        parsing = true;
        try {
            return copyLintTokens(parse(source, env));
        } finally {
            parsing = false;
        }
    };
}
