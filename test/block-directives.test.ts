import type {MarkdownIt as MarkdownItInstance} from 'markdown-it';

import MarkdownIt from 'markdown-it';
import {describe, expect, it, vi} from 'vitest';
import {transform as cut} from '@diplodoc/cut-extension/plugin';
import {createNotesPlugin} from '@diplodoc/notes-extension/plugin';
import {transform as tabs} from '@diplodoc/tabs-extension/plugin';

import {LogLevels, yfmlint} from '../src';
import {captureBlockDirectives} from '../src/rules/block-directives';

const lintConfig = {default: false, YFM005: LogLevels.ERROR, YFM020: LogLevels.ERROR};

async function diagnostics(source: string, plugins: unknown[] = [], enableMarkdownAttrs = true) {
    return (
        (await yfmlint(source, 'test.md', {lintConfig, plugins, enableMarkdownAttrs})) || []
    ).map(({ruleNames, lineNumber, errorDetail, errorContext}) => ({
        code: ruleNames[0],
        line: lineNumber,
        reason: errorDetail,
        context: errorContext,
    }));
}

describe('colon block diagnostics', () => {
    it.each(['cut [Title]', 'note {type=info}', 'tabs', 'CUT [Title]', 'TaBs'])(
        'reports an unclosed %s',
        async (header) => {
            expect(await diagnostics(`:::${header}\n\nBody`)).toEqual([
                {
                    code: 'YFM005',
                    line: 1,
                    reason: expect.stringContaining('must be closed'),
                    context: `:::${header}`,
                },
            ]);
        },
    );

    it.each([
        ['cut {open=wrong}', 'The cut open attribute must be true or false'],
        ['note {type=bad}', 'Note type must be info, tip, warning or alert'],
        ['tabs {variant=bad}', 'Invalid tabs variant'],
        ['note [bad', 'Invalid note directive parameters'],
        ['NOTE {type=bad}', 'Note type must be info, tip, warning or alert'],
    ])('reports the canonical parameter reason for %s', async (header, reason) => {
        expect(await diagnostics(`:::${header}\n\nBody\n\n:::`)).toEqual([
            {code: 'YFM020', line: 1, reason, context: `:::${header}`},
        ]);
    });

    it.each(['disabled', 'enabled', 'only'] as const)(
        'reports the same invalid parameters with caller rendering mode %s',
        async (directiveSyntax) => {
            const plugin = createNotesPlugin(undefined, undefined, {directiveSyntax});

            expect(await diagnostics(':::note {type=bad}\n\nBody\n\n:::', [plugin])).toMatchObject([
                {code: 'YFM020', line: 1, reason: 'Note type must be info, tip, warning or alert'},
            ]);
        },
    );

    it.each(['regular', 'radio', 'dropdown', 'accordion'])(
        'accepts the canonical tabs variant %s',
        async (variant) => {
            expect(
                await diagnostics(`:::tabs {variant=${variant}}\n\n- First\n\n  Body\n\n:::`),
            ).toEqual([]);
        },
    );

    it.each([true, false])('accepts closed blocks with attrs %s and no renderer', async (attrs) => {
        expect(await diagnostics(':::cut [Title]\n\nBody\n\n:::', [], attrs)).toEqual([]);
    });

    it.each([
        '```md\n:::cut [Title]\n```',
        '    :::cut [Title]\n\n    Body',
        '\\:::cut [Title]\n\nBody',
        '<div>\n:::cut [Title]\n</div>',
        '<!-- no-translate\n:::cut [Title]\n-->',
        '`:::cut [Title]`',
        ':::custom\n\nBody',
        ':::cut-extra\n\nBody',
    ])('ignores non-candidate input %s', async (source) => {
        expect(await diagnostics(source)).toEqual([]);
    });

    it('observes only original paragraph openers in multiline fallback text', async () => {
        expect(await diagnostics(':::tabs\nBody')).toMatchObject([
            {code: 'YFM005', line: 1, context: ':::tabs'},
        ]);
        expect(await diagnostics('Text\n:::note {type=bad}')).toEqual([]);
        expect(await diagnostics(':::note [bad\nBody\n:::')).toMatchObject([
            {code: 'YFM020', line: 1, reason: 'Invalid note directive parameters'},
        ]);
    });

    it('reports both original nested fallback paragraphs', async () => {
        expect(
            (await diagnostics(':::cut [Outer]\n\n:::note {type=info}\n\nBody')).map(
                ({code, line}) => ({code, line}),
            ),
        ).toEqual([
            {code: 'YFM005', line: 1},
            {code: 'YFM005', line: 3},
        ]);
    });

    it.each([
        ['> :::cut [Title]\n>\n> Body', '> :::cut [Title]'],
        ['- :::cut [Title]\n\n  Body', '- :::cut [Title]'],
        ['Intro\n\n> :::cut [Title]\n>\n> Body', '> :::cut [Title]'],
    ])('preserves source container prefixes in %s', async (source, context) => {
        const result = await diagnostics(source);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({code: 'YFM005', context});
        expect(result[0].line).toBe(source.startsWith('Intro') ? 3 : 1);
    });

    it('does not let an existing tabs signal suppress an independent colon refusal', async () => {
        const signal = (md: MarkdownItInstance) => {
            md.core.ruler.push('test_signal', (state) => {
                state.tokens
                    .find((token) => token.type === 'paragraph_open')
                    ?.attrSet('YFM005', 'true');
            });
        };
        const result = await diagnostics('Text\n\n:::cut [Parent]\n\nBody', [signal]);

        expect(result.map(({line}) => line)).toEqual([1, 3]);
    });

    it('preserves caller plugin order, options identity and one invocation', async () => {
        const calls: string[] = [];
        const options = {custom: 'value'};
        const first = vi.fn((md: MarkdownItInstance, received: unknown) => {
            expect(received).toBe(options);
            calls.push('first');
            expect(md.core.ruler.getRules('').length).toBeGreaterThan(0);
        });
        const second = vi.fn(() => calls.push('second'));

        await yfmlint(':::cut [Title]\n\nBody', 'test.md', {
            lintConfig,
            plugins: [first, second],
            pluginOptions: options,
        });

        expect(calls).toEqual(['first', 'second']);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('keeps globally disabled rules quiet', async () => {
        expect(
            await yfmlint(':::cut [Title]', 'test.md', {
                lintConfig: {default: false, YFM005: false, YFM020: false},
            }),
        ).toEqual([]);
    });

    it.each(['block-not-closed', 'BLOCK-NOT-CLOSED', 'directives'])(
        'honors existing rule aliases/tags: %s',
        async (selector) => {
            const errors = await yfmlint(':::cut [Missing]', 'test.md', {
                lintConfig: {default: false, YFM005: false, YFM020: false, [selector]: true},
            });

            expect(errors).toMatchObject([{ruleNames: ['YFM005', 'block-not-closed']}]);
        },
    );

    it('honors an alias that disables both configured rules', async () => {
        expect(
            await yfmlint(':::cut [Missing]', 'test.md', {
                lintConfig: {default: false, YFM005: true, YFM020: true, directives: false},
            }),
        ).toEqual([]);
    });

    it.each(['YFM005', 'block-not-closed', 'directives'])(
        'honors inline enablement after globally disabled config: %s',
        async (selector) => {
            const errors = await yfmlint(
                `<!-- markdownlint-enable ${selector} -->\n\n:::cut [Missing]`,
                'test.md',
                {lintConfig: {default: false, YFM005: false, YFM020: false}},
            );

            expect(errors).toMatchObject([
                {lineNumber: 3, ruleNames: ['YFM005', 'block-not-closed']},
            ]);
        },
    );

    it('does not invoke caller diagnostics, resources, IDs or logs a second time', async () => {
        const onDiagnostic = vi.fn();
        const onNote = vi.fn();
        const generateID = vi.fn(() => 'caller-id');
        const log = {warn: vi.fn(), error: vi.fn()};
        const plugins = [
            cut({runtime: false, bundle: false, directiveSyntax: 'enabled', onDiagnostic}),
            createNotesPlugin(undefined, onNote, {directiveSyntax: 'enabled', onDiagnostic}),
            tabs({bundle: false, directiveSyntax: 'enabled', onDiagnostic}),
        ];
        const source = ':::note {type=bad}\n\nBody\n\n:::';

        for (const enabled of [false, true]) {
            vi.clearAllMocks();
            await yfmlint(source, 'test.md', {
                plugins,
                pluginOptions: {generateID, log},
                lintConfig: enabled ? lintConfig : {default: false},
            });

            expect(onDiagnostic).toHaveBeenCalledTimes(1);
            expect(onNote).not.toHaveBeenCalled();
            expect(generateID).not.toHaveBeenCalled();
            expect(log.warn).not.toHaveBeenCalled();
            expect(log.error).not.toHaveBeenCalled();
        }
    });

    it('honors root markdownlint suppression and custom legacy directives', async () => {
        expect(
            await diagnostics(
                '<!-- markdownlint-disable YFM005 -->\n\n:::cut [Hidden]\n\n<!-- markdownlint-enable YFM005 -->\n\n:::cut [Visible]',
            ),
        ).toEqual([
            {code: 'YFM005', line: 7, context: ':::cut [Visible]', reason: expect.any(String)},
        ]);
        expect(
            await yfmlint('{% custom %}', 'test.md', {
                lintConfig: {
                    default: false,
                    YFM020: {loglevel: LogLevels.ERROR, customDirectives: ['custom']},
                },
            }),
        ).toEqual([]);
    });

    it('supports the native Markdown-it 15 host', () => {
        const md = new MarkdownIt({html: true});
        captureBlockDirectives(md);
        const tokens = md.parse(':::cut [Title]\n\nBody', {});
        const token = tokens.find((item) => item.type === 'paragraph_open');
        const descriptors = Object.getOwnPropertySymbols(token || {}).map((key) =>
            Object.getOwnPropertyDescriptor(token, key),
        );

        expect(descriptors).toHaveLength(1);
        expect(descriptors[0]?.enumerable).toBe(false);
        expect(Object.isFrozen(descriptors[0]?.value)).toBe(true);
        expect(tokens.map((item) => item.type)).toEqual([
            'paragraph_open',
            'inline',
            'paragraph_close',
            'paragraph_open',
            'inline',
            'paragraph_close',
        ]);
    });

    it.each([false, true])(
        'defers private parser failure to enabled rules: %s',
        async (enabled) => {
            const parse = MarkdownIt.prototype.parse;
            const parser = vi.spyOn(MarkdownIt.prototype, 'parse').mockImplementation(function (
                this: InstanceType<typeof MarkdownIt>,
                source,
                env,
            ) {
                // Fail only the observer's block-only parser, not the lint host.
                if (this.core.ruler.getRules('').length === 2) {
                    throw new Error('private parser unavailable');
                }

                return parse.call(this, source, env);
            });

            try {
                const errors = await yfmlint(':::cut [Title]', 'test.md', {
                    lintConfig: {default: false, YFM005: enabled, YFM020: false},
                });

                if (enabled) {
                    expect(errors).toMatchObject([
                        {
                            ruleNames: ['YFM005', 'block-not-closed'],
                            errorDetail:
                                'This rule threw an exception: YFM block directive validation failed: private parser unavailable',
                        },
                    ]);
                } else {
                    expect(errors).toEqual([]);
                }
            } finally {
                parser.mockRestore();
            }
        },
    );

    it('keeps repeated root parses independent', async () => {
        expect(await diagnostics(':::cut [Missing]')).toHaveLength(1);
        expect(await diagnostics(':::cut [Closed]\n\nBody\n\n:::')).toEqual([]);
        expect(await diagnostics(':::cut [Missing]')).toHaveLength(1);
    });
});
