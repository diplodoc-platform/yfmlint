import type {MarkdownIt} from 'markdown-it';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {LogLevels, yfmlint} from '../src';
import {yfm024} from '../src/rules/yfm024';

afterEach(() => vi.restoreAllMocks());

// This is the JavaScript pattern used by the VS Code validation caller.
const vscodeFrontMatter = /^---[ \t]*\r?\n([\s\S]*?)(?<=\n)---[ \t]*(?:\r?\n|$)/;

describe('upstream markdownlint integration', () => {
    it.each(['\n', '\r\n'])(
        'preserves JS front matter lookbehind and body diagnostics with line ending %j',
        async (newline) => {
            const content = [
                '\uFEFF---',
                'title: "Test 😀 [a] (?=b)"',
                'metadata: "<!--MARKDOWNLINT-DISABLE MD033-->"',
                '---',
                '',
                '# Duplicate heading',
                '',
                '<span>Report me</span>',
                '',
                '<!-- markdownlint-disable MD033 -->',
                '',
                '<span>Ignore me</span>',
            ].join(newline);
            const result = await yfmlint(content, 'custom-frontmatter.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {default: false, MD025: true, MD033: true},
            });

            expect(result?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual([
                [6, 'MD025'],
                [8, 'MD033'],
            ]);
            expect(result?.every((item) => !('severity' in item))).toBe(true);
        },
    );

    it('applies a lookahead against the original line endings before linting', async () => {
        const result = await yfmlint(
            '---\r\ntitle: <i>test</i>\r\n---\r\n\r\n<b>body</b>\r\n',
            'lookahead.md',
            {
                frontMatter: /^---\r\n(?=title:)[\s\S]+?\r\n---\r\n/,
                lintConfig: {default: false, MD033: true},
            },
        );

        expect(result).toMatchObject([{lineNumber: 5, errorDetail: 'Element: b'}]);
    });

    it.each([
        ['LF with a closing marker', '\n', '---'],
        ['CRLF with a padded closing marker', '\r\n', '--- \t'],
        ['CR with a closing marker', '\r', '---'],
    ])(
        'reports and fixes trailing whitespace after front matter for %s',
        async (_name, newline, closing) => {
            const content = ['---', 'title: Test', closing, 'body '].join(newline);
            const errors = await yfmlint(content, 'trailing-whitespace.md', {
                frontMatter: /^---[\s\S]+?---/,
                lintConfig: {default: false, MD009: true},
            });

            expect(errors).toMatchObject([
                {
                    lineNumber: 4,
                    ruleNames: ['MD009', 'no-trailing-spaces'],
                    fixInfo: {editColumn: 5, deleteCount: 1},
                },
            ]);
        },
    );

    it('preserves the line count when the pattern matches only the CR in a CRLF', async () => {
        const errors = await yfmlint('---\r\ntitle: Test\r\n---\r\nbody ', 'partial-crlf.md', {
            frontMatter: /^---[\s\S]+?---\r/,
            lintConfig: {default: false, MD009: true},
        });

        expect(errors).toMatchObject([{lineNumber: 4, fixInfo: {editColumn: 5, deleteCount: 1}}]);
    });

    it('accepts a padded closing marker at the end of the file', async () => {
        const errors = await yfmlint('---\ntitle: Test\n--- ', 'header-only.md', {
            frontMatter: /^---[\s\S]+?---/,
            lintConfig: {default: false, MD009: true},
        });

        expect(errors).toEqual([]);
    });

    it('preserves plugin registration order and autolink settings', async () => {
        const observed: string[] = [];
        const plugin = (md: MarkdownIt, options: {isLintRun: boolean}) => {
            expect(options.isLintRun).toBe(true);
            expect(md.options.html).toBe(true);
            md.set({linkify: true});
            md.core.ruler.push('capture_links', (state) => {
                for (const token of state.tokens) {
                    for (const child of token.children || []) {
                        const link = child.attrGet('href');
                        if (typeof link === 'string') {
                            observed.push(link);
                        }
                    }
                }
            });
        };

        await yfmlint(
            'example.org user@example.org https://user:pass@example.org/path',
            'links.md',
            {plugins: [plugin, (md: MarkdownIt) => expect(md.options.linkify).toBe(true)]},
        );

        expect(observed).toEqual([
            'http://example.org',
            'mailto:user@example.org',
            'https://user:pass@example.org/path',
        ]);
    });

    it.each(['plain record', 'class instance'] as const)(
        'freezes lint metadata without freezing a plugin-owned %s',
        async (kind) => {
            class PluginMetadata {
                [key: string]: unknown;

                sourceFile = 'included.md';
                includeChain = [{file: 'main.md', line: 1}];
            }

            const key = Symbol('plugin metadata');
            const sourceInfo = {
                sourceFile: 'included.md',
                includeChain: [{file: 'main.md', line: 1}],
            };
            const metadata =
                kind === 'class instance'
                    ? new PluginMetadata()
                    : Object.assign(Object.create(null) as object, sourceInfo);
            Object.defineProperty(metadata, key, {value: 'hidden', enumerable: false});
            const plugin = (md: MarkdownIt) => {
                md.core.ruler.push('set_plugin_metadata', (state) => {
                    const token = state.tokens.find((item) => item.type === 'inline');
                    if (token?.children?.length) {
                        token.children[0].meta = metadata;
                    }
                });
            };
            const rule = vi.spyOn(yfm024, 'function');

            const errors = await yfmlint('# Heading', 'metadata.md', {
                plugins: [plugin],
                lintConfig: {default: false, YFM024: LogLevels.ERROR},
            });

            expect(errors).toEqual([]);
            const {tokens} = rule.mock.calls[0][0].parsers.markdownit;
            const child = tokens.find((token) => token.type === 'inline')?.children?.[0];
            expect(child?.meta).toMatchObject(sourceInfo);
            expect(Object.getPrototypeOf(child?.meta)).toBe(Object.getPrototypeOf(metadata));
            expect(Object.getOwnPropertyDescriptor(child?.meta, key)?.value).toBe('hidden');
            expect(Object.isFrozen(child?.meta)).toBe(true);
            expect(Object.isFrozen(metadata)).toBe(false);
            expect(() => {
                metadata.sourceFile = 'updated.md';
            }).not.toThrow();
            expect(child?.meta?.sourceFile).toBe('included.md');
        },
    );

    it('attributes a broken link through a plugin getter that uses private class state', async () => {
        class IncludeMetadata {
            [key: string]: unknown;

            #file = 'included.md';
            includeChain = [{file: 'main.md', line: 1}];

            get sourceFile() {
                return this.#file;
            }

            get unused() {
                throw new Error('Unused metadata getter was evaluated');
            }
        }

        const metadata = new IncludeMetadata();
        const plugin = (md: MarkdownIt) => {
            md.core.ruler.push('mark_broken_include_link', (state) => {
                const inline = state.tokens.find((token) => token.type === 'inline');
                const link = inline?.children?.find((token) => token.type === 'link_open');
                if (link) {
                    link.attrSet('YFM003', 'file-not-found');
                    link.meta = metadata;
                }
            });
        };

        const errors = await yfmlint('[Link](absent.md)', 'main.md', {
            plugins: [plugin],
            lintConfig: {default: false, YFM003: LogLevels.ERROR},
        });

        expect(errors).toMatchObject([
            {
                lineNumber: 1,
                errorContext:
                    'main.md:1 → included.md:1 ↛ absent.md; Reason: File does not exist in the project',
            },
        ]);
        expect(Object.isFrozen(metadata)).toBe(false);
    });
});
