import type {MarkdownIt, Token} from 'markdown-it';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {LogLevels, yfmlint} from '../src';
import {prepareFrontMatter} from '../src/markdownlint';
import {yfm024} from '../src/rules/yfm024';

afterEach(() => vi.restoreAllMocks());

// This is the JavaScript pattern used by the VS Code validation caller.
const vscodeFrontMatter = /^---[ \t]*\r?\n([\s\S]*?)(?<=\n)---[ \t]*(?:\r?\n|$)/;

describe('upstream markdownlint integration', () => {
    it.each([
        ['an empty first line', '\n'],
        ['a BOM and a blank CRLF line', '\uFEFF\t \r\n'],
        ['a leading HTML comment', '<!-- generated\nintro -->\n'],
    ])('preserves MD025 behavior after %s', async (_name, prefix) => {
        const content = prefix + '# Page\n\n# Section\n';
        const result = await yfmlint(content, 'headings.md', {
            lintConfig: {default: false, MD025: true},
        });

        expect(result).toEqual([]);
    });

    it.each(['# Page', 'Page\n===='])(
        'reports a second title when %j starts on the first line',
        async (title) => {
            const result = await yfmlint(`${title}\n\n# Section\n`, 'headings.md', {
                lintConfig: {default: false, MD025: true},
            });

            expect(result).toMatchObject([{ruleNames: ['MD025', 'single-title', 'single-h1']}]);
        },
    );

    it('keeps other diagnostics and inline suppression after a leading comment', async () => {
        const content = [
            '<!-- markdownlint-disable-next-line MD033 -->',
            '# Page <span>ignored</span>',
            '',
            '# Section <span>reported</span>',
        ].join('\n');
        const result = await yfmlint(content, 'headings.md', {
            lintConfig: {default: false, MD025: true, MD033: true},
        });

        expect(result).toMatchObject([{ruleNames: ['MD033', 'no-inline-html'], lineNumber: 4}]);
    });

    it('keeps other micromark diagnostics on a page without inline HTML', async () => {
        const errors = await yfmlint('Use &lt;kbd&gt; for keys.\n', 'plain.md', {
            lintConfig: {default: false, MD033: true, MD041: true},
        });

        expect(errors?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual([
            [1, 'MD041'],
        ]);
    });

    it('evaluates custom inline HTML rule options on a page without inline HTML', async () => {
        class AllowedElement {
            toString() {
                throw new Error('Could not read the allowed element');
            }
        }

        const errors = await yfmlint('Plain content.\n', 'custom-html-options.md', {
            lintConfig: {default: false, MD033: {allowed_elements: [new AllowedElement()]}},
        });

        expect(errors).toMatchObject([
            {
                ruleNames: ['MD033', 'no-inline-html'],
                errorDetail: expect.stringContaining('Could not read the allowed element'),
            },
        ]);
    });

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
        const content = `---\r\ntitle: ${'Test'.repeat(1024)}\r\n---\r\nbody `;
        const errors = await yfmlint(content, 'partial-crlf.md', {
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

    it('keeps the lint input small for long metadata', async () => {
        const document = (summary: string) =>
            `---\ntitle: Test\nsummary: ${summary}\n---\n\n<div>Body</div> `;
        const long = document('metadata'.repeat(8192));

        const prepared = prepareFrontMatter(long, vscodeFrontMatter);
        expect(prepared.content.length).toBeLessThan(128);
        expect(prepared.content).toMatch(/\n\n<div>Body<\/div> $/);

        const errors = await yfmlint(long, 'long-metadata.md', {
            frontMatter: vscodeFrontMatter,
            lintConfig: {default: false, MD009: true},
        });

        expect(errors).toMatchObject([{lineNumber: 6, fixInfo: {editColumn: 16, deleteCount: 1}}]);
    });

    it.each(['# remark', '# <!-- keep\ttab -->'])(
        'preserves offsets beyond the RE2 repeat limit with %j in YAML',
        async (comment) => {
            const properties = Array.from({length: 1000}, (_, index) => `prop${index}: value`);
            const content = ['---', comment, ...properties, '---', '', '<span>Body</span>'].join(
                '\n',
            );
            const errors = await yfmlint(content, 'many-metadata-lines.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {default: false, MD033: true},
            });

            expect(errors).toMatchObject([{lineNumber: 1005, errorDetail: 'Element: span'}]);
        },
    );

    it('stops a custom front matter match at the exact position within a line', async () => {
        const captureSource = vi.fn();
        const plugin = (md: MarkdownIt) => {
            md.core.ruler.push('capture_body', (state) => captureSource(state.src));
        };

        await yfmlint(`---\ntitle: ${'Test'.repeat(1024)}\n---Body`, 'partial-line.md', {
            frontMatter: /^---[\s\S]+?---/,
            lintConfig: {default: false, YFM001: true},
            plugins: [plugin],
        });

        expect(captureSource).toHaveBeenCalledExactlyOnceWith('Body');
    });

    it.each(['\n', '\r\n'])(
        'keeps body line directives aligned after a partial closing line with %j endings',
        async (newline) => {
            const content = [
                '---',
                'title: Test',
                '--- <!-- markdownlint-disable-next-line MD009 -->',
                'hidden ',
                'visible ',
                '',
            ].join(newline);
            const errors = await yfmlint(content, 'partial-suppression.md', {
                frontMatter: /^---[\s\S]+?---/,
                lintConfig: {default: false, MD009: true},
            });

            expect(errors).toMatchObject([
                {
                    lineNumber: 6,
                    ruleNames: ['MD009', 'no-trailing-spaces'],
                    fixInfo: {editColumn: 8},
                },
            ]);
        },
    );

    it('reports a body diagnostic after a partial closing line at EOF', async () => {
        const errors = await yfmlint('---\ntitle: Test\n---visible ', 'partial-eof.md', {
            frontMatter: /^---[\s\S]+?---/,
            lintConfig: {default: false, MD009: true},
        });

        expect(errors).toMatchObject([
            {lineNumber: 4, errorDetail: 'Expected: 0 or 2; Actual: 1', fixInfo: {editColumn: 8}},
        ]);
    });

    it.each(['\n', ' '])(
        'ignores a configure-file command split by the YAML boundary %j',
        async (separator) => {
            const content = [
                '---',
                `<!--${separator}markdownlint-configure-file {"MD033": false} -->`,
                '<span>Visible body</span>',
                '',
            ].join('\n');
            const errors = await yfmlint(content, 'split-config.md', {
                frontMatter: /^---\n<!--(?:\n| )/,
                lintConfig: {default: false, MD033: true},
            });

            expect(errors?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual([
                [4, 'MD033'],
            ]);
        },
    );

    it.each([
        '<!-- markdownlint-disable -->\n{% include [missing](missing.md) %}',
        '{% include [missing](missing.md) %} <!-- markdownlint-disable-line -->',
    ])('skips Markdown-it plugins when the entire body is disabled by %j', async (body) => {
        const plugin = vi.fn();
        const errors = await yfmlint(`---\ntitle: Test\n---\n${body}`, 'disabled-body.md', {
            frontMatter: vscodeFrontMatter,
            lintConfig: {default: false, YFM003: true},
            plugins: [plugin],
        });

        expect(errors).toEqual([]);
        expect(plugin).not.toHaveBeenCalled();
    });

    it('runs Markdown-it plugins when a body directive re-enables a rule', async () => {
        const plugin = vi.fn();
        const body = [
            '<!-- markdownlint-disable -->',
            'Disabled paragraph.',
            '<!-- markdownlint-enable YFM003 -->',
            'Enabled paragraph.',
        ].join('\n');

        await yfmlint(`---\ntitle: Test\n---\n${body}`, 'enabled-body.md', {
            frontMatter: vscodeFrontMatter,
            lintConfig: {default: false, YFM003: true},
            plugins: [plugin],
        });

        expect(plugin).toHaveBeenCalledOnce();
    });

    it('skips Markdown-it plugins when the body only re-enables a micromark rule', async () => {
        const plugin = vi.fn();
        const content = [
            '---',
            'title: Test',
            '---',
            '<!-- markdownlint-disable -->',
            '<!-- markdownlint-enable MD033 -->',
            '<span>Visible body</span>',
        ].join('\n');
        const errors = await yfmlint(content, 'micromark-only.md', {
            frontMatter: vscodeFrontMatter,
            lintConfig: {default: false, MD033: true, YFM003: true},
            plugins: [plugin],
        });

        expect(errors?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual([
            [6, 'MD033'],
        ]);
        expect(plugin).not.toHaveBeenCalled();
    });

    it.each(['plain body', 'restore'] as const)(
        'preserves the body state after a file directive with %s',
        async (mode) => {
            const body = [
                '<!-- markdownlint-disable-file MD033 -->',
                mode === 'restore' ? '<!-- markdownlint-restore -->' : '',
                '<span>Body</span>',
            ].join('\n');
            const errors = await yfmlint(`---\ntitle: Test\n---\n${body}`, 'restore.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {default: false, MD033: true},
            });

            expect(errors?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual(
                mode === 'restore' ? [[6, 'MD033']] : [],
            );
        },
    );

    it.each(['default', 'caller config', 'inline config', 'placeholder'] as const)(
        'preserves %s title detection after shortening a long header line',
        async (mode) => {
            const titleRule = {
                front_matter_title: mode === 'placeholder' ? '^-$' : '^summary: .*tail 😀$',
            };
            const inlineConfig = JSON.stringify({'single-title': titleRule});
            const field = mode === 'default' ? 'title' : 'summary';
            const content = [
                '---',
                `${field}: ${'metadata'.repeat(8192)}tail 😀`,
                '---',
                mode === 'inline config'
                    ? `<!-- markdownlint-configure-file ${inlineConfig} -->`
                    : '',
                '# Duplicate title',
            ].join('\n');
            const errors = await yfmlint(content, 'long-title.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {
                    default: false,
                    'single-title':
                        mode === 'default' || mode === 'inline config' ? true : titleRule,
                },
            });

            expect(errors?.map(({ruleNames, lineNumber}) => [ruleNames[0], lineNumber])).toEqual(
                mode === 'placeholder' ? [] : [['MD025', 5]],
            );
        },
    );

    it.each([
        ['quote prefixes', '>'.repeat(4096), true],
        ['nonblank text', `${'>'.repeat(4096)}Metadata`, false],
        ['an HTML comment', `<!-- ${'metadata'.repeat(1024)} -->`, true],
        ['an unclosed inline config comment', '<!-- markdownlint-disable MD033', true],
    ])('preserves MD022 spacing across a header ending in %s', async (_name, finalLine, blank) => {
        const content = ['---', finalLine, '# Body', '', 'Paragraph'].join('\n');
        const errors = await yfmlint(content, 'header-spacing.md', {
            frontMatter: /^---\n[^\n]*\n/,
            lintConfig: {default: false, MD022: {include_front_matter: true}},
        });

        if (blank) {
            expect(errors).toEqual([]);
        } else {
            expect(errors).toMatchObject([{lineNumber: 3, fixInfo: {insertText: '\n'}}]);
        }
    });

    it.each(['caller config', 'inline config'] as const)(
        'matches the original YAML title with a custom pattern from %s',
        async (source) => {
            const title = {front_matter_title: '^title: "<!-- markdownlint-disable MD033'};
            const titleRules = {MD001: title, 'single-title': title, MD041: title};
            const inlineConfig = JSON.stringify(titleRules).replace(/</g, '\\u003c');
            const content = [
                '---',
                'title: "<!-- markdownlint-disable MD033 -->"',
                '---',
                '',
                source === 'inline config'
                    ? `<!-- markdownlint-configure-file ${inlineConfig} -->`
                    : '',
                '',
                '<span>Visible body</span>',
                '',
                '### Skipped heading level',
                '',
                '# Duplicate title',
            ].join('\n');

            const result = await yfmlint(content, 'title-pattern.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {
                    default: false,
                    MD033: true,
                    ...(source === 'caller config' ? titleRules : {}),
                },
            });

            expect(result?.map(({lineNumber, ruleNames}) => [lineNumber, ruleNames[0]])).toEqual([
                [9, 'MD001'],
                [11, 'MD025'],
                [7, 'MD033'],
            ]);
        },
    );

    it('does not count a pattern that only matches the masked header as a title', async () => {
        const content = '---\ntitle: "<!-- markdownlint-disable MD033 -->"\n---\n\nSome text.';
        const result = await yfmlint(content, 'masked-title.md', {
            frontMatter: vscodeFrontMatter,
            lintConfig: {
                default: false,
                MD041: {front_matter_title: '^title: "<!-- markdownlinx'},
            },
        });

        expect(result).toMatchObject([
            {lineNumber: 5, ruleNames: ['MD041', 'first-line-heading', 'first-line-h1']},
        ]);
    });

    it.each(['enabled', 'disabled by alias', 'disabled by comment'] as const)(
        'handles an invalid custom title pattern when the rule is %s',
        async (status) => {
            const evaluateTitle = vi.fn(() => {
                throw new Error('Could not read the title pattern');
            });
            class TitlePattern {
                toString() {
                    return evaluateTitle();
                }
            }

            const content = [
                '---',
                'title: "<!-- markdownlint-disable MD033 -->"',
                '---',
                status === 'disabled by comment'
                    ? '<!-- markdownlint-configure-file {"MD041": false} -->'
                    : '',
                '<span>Visible body</span>',
            ].join('\n');

            const result = await yfmlint(content, 'lazy-title.md', {
                frontMatter: vscodeFrontMatter,
                lintConfig: {
                    default: false,
                    MD033: true,
                    MD041: {front_matter_title: new TitlePattern()},
                    ...(status === 'disabled by alias' ? {'first-line-heading': false} : {}),
                },
            });

            const codes = result?.map(({ruleNames}) => ruleNames[0]);
            if (status === 'enabled') {
                expect(evaluateTitle).toHaveBeenCalledOnce();
                expect(codes).toEqual(['MD033', 'MD041']);
                expect(result?.[1]?.errorDetail).toContain('Could not read the title pattern');
            } else {
                expect(evaluateTitle).not.toHaveBeenCalled();
                expect(codes).toEqual(['MD033']);
            }
        },
    );

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

    it.each(['own', 'inherited'] as const)(
        'isolates metadata exposed by a token getter (%s)',
        async (kind) => {
            const metadata = {sourceFile: 'included.md'};
            const getter = vi.fn(() => metadata);
            const plugin = (md: MarkdownIt) => {
                md.core.ruler.push('expose_link_metadata', (state) => {
                    const inline = state.tokens.find((token) => token.type === 'inline');
                    const link = inline?.children?.find((token) => token.type === 'link_open');
                    if (!link) {
                        throw new Error('Expected a link in the parsed tokens');
                    }

                    const owner =
                        kind === 'own' ? link : Object.create(Object.getPrototypeOf(link));
                    Object.defineProperty(owner, 'meta', {get: getter});
                    if (kind === 'inherited') {
                        Reflect.deleteProperty(link, 'meta');
                        Object.setPrototypeOf(link, owner);
                    }
                });
            };
            const rule = vi.spyOn(yfm024, 'function');

            const errors = await yfmlint('[Link](target.md)', 'metadata.md', {
                plugins: [plugin],
                lintConfig: {default: false, YFM024: LogLevels.ERROR},
            });

            expect(errors).toEqual([]);
            const {tokens} = rule.mock.calls[0][0].parsers.markdownit;
            const inline = tokens.find((token) => token.type === 'inline');
            const link = inline?.children?.find((token) => token.type === 'link_open');
            expect(link?.meta).toEqual(metadata);
            expect(Object.isFrozen(link?.meta)).toBe(true);
            expect(Object.isFrozen(metadata)).toBe(false);
            metadata.sourceFile = 'updated.md';
            expect(link?.meta?.sourceFile).toBe('included.md');
            expect(getter).toHaveBeenCalledTimes(1);
        },
    );

    it('retains token descriptors on copied links and their parents', async () => {
        const annotation = Symbol('annotation');
        const unused = vi.fn(() => 'plugin note');
        const metadata = {linksPluginProcessed: true};
        const plugin = (md: MarkdownIt) => {
            md.core.ruler.push('annotate_link', (state) => {
                const inline = state.tokens.find((token) => token.type === 'inline');
                const link = inline?.children?.find((token) => token.type === 'link_open');
                if (!inline || !link) {
                    throw new Error('Expected a link in the parsed tokens');
                }

                Object.defineProperty(inline, annotation, {value: 'parent'});
                Object.defineProperty(link, annotation, {value: 'link'});
                Object.defineProperty(link, 'pluginNote', {get: unused, enumerable: true});
                link.meta = metadata;
            });
        };
        const rule = vi.spyOn(yfm024, 'function');

        await yfmlint('[Link](target.md)', 'tokens.md', {
            plugins: [plugin],
            lintConfig: {default: false, YFM024: LogLevels.ERROR},
        });

        const {tokens} = rule.mock.calls[0][0].parsers.markdownit;
        const inline = tokens.find((token) => token.type === 'inline');
        const link = inline?.children?.find((token) => token.type === 'link_open');
        expect(Object.getOwnPropertyDescriptor(inline, annotation)?.value).toBe('parent');
        expect(Object.getOwnPropertyDescriptor(link, annotation)?.value).toBe('link');
        expect(Object.getOwnPropertyDescriptor(link, 'pluginNote')?.get).toBe(unused);
        expect(unused).not.toHaveBeenCalled();
        expect(Object.isFrozen(link?.meta)).toBe(true);
        expect(Object.isFrozen(metadata)).toBe(false);
    });

    it('keeps nested parses owned by the plugin until the outer result reaches markdownlint', async () => {
        const metadata = {linksPluginProcessed: true};
        const plugin = (md: MarkdownIt) => {
            md.core.ruler.push('parse_nested', (state) => {
                if (state.src === 'outer') {
                    state.tokens = md.parse('[Link](target.md)', state.env);
                    const token = state.tokens.find((item) => item.type === 'inline');
                    expect(token?.children?.[0].meta).toBe(metadata);
                } else {
                    const token = state.tokens.find((item) => item.type === 'inline');
                    if (!token?.children?.[0]) {
                        throw new Error('Expected a link from the nested parse');
                    }

                    token.children[0].meta = metadata;
                }
            });
        };
        const rule = vi.spyOn(yfm024, 'function');

        await yfmlint('outer', 'nested.md', {
            plugins: [plugin],
            lintConfig: {default: false, YFM024: LogLevels.ERROR},
        });

        const {tokens} = rule.mock.calls[0][0].parsers.markdownit;
        const inline = tokens.find((token) => token.type === 'inline');
        expect(inline?.children?.[0].meta).toEqual(metadata);
        expect(Object.isFrozen(inline?.children?.[0].meta)).toBe(true);
        expect(Object.isFrozen(metadata)).toBe(false);
    });

    it('attributes a broken link with a private getter and preserves the retained token metadata', async () => {
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
        let retainedLink: Token | undefined;
        const plugin = (md: MarkdownIt) => {
            md.core.ruler.push('mark_broken_include_link', (state) => {
                const inline = state.tokens.find((token) => token.type === 'inline');
                const link = inline?.children?.find((token) => token.type === 'link_open');
                if (link) {
                    link.attrSet('YFM003', 'file-not-found');
                    link.meta = metadata;
                    retainedLink = link;
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
        const retainedMetadata = retainedLink?.meta;
        if (!retainedMetadata) {
            throw new Error('Expected metadata on the retained link');
        }
        expect(retainedMetadata).toBe(metadata);
        retainedMetadata.checked = true;
        expect(metadata.checked).toBe(true);
    });
});
