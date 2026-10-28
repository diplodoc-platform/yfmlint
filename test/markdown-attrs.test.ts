import type MarkdownIt from 'markdown-it';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {LogLevels, yfmlint} from '../src';
import {yfm024} from '../src/rules/yfm024';

// Observe the real markdownlint rule input; its implementation still runs normally.
// This also proves installation when callers provide no custom plugins.
afterEach(() => vi.restoreAllMocks());

describe.each(['absent', 'empty', 'populated'] as const)('attrs with %s plugins', (kind) => {
    it.each([undefined, true, false])(
        'honors selector %s in the actual native parser',
        async (flag) => {
            const rule = vi.spyOn(yfm024, 'function');
            let parserVersion = '';
            const capture = (md: MarkdownIt) => {
                parserVersion = typeof md.parse;
            };
            const plugins = kind === 'absent' ? {} : {plugins: kind === 'empty' ? [] : [capture]};
            const errors = await yfmlint('## Heading {#custom}\n\nHello {name}\n', 'attrs.md', {
                ...plugins,
                enableMarkdownAttrs: flag,
                lintConfig: {default: false, YFM024: LogLevels.ERROR},
            });
            expect(errors).toEqual([]);
            expect(rule).toHaveBeenCalledOnce();
            const tokens = rule.mock.calls[0][0].parsers.markdownit.tokens;
            const heading = tokens.find((token) => token.type === 'heading_open');
            const inline = tokens.filter((token) => token.type === 'inline');
            expect(heading?.attrs).toEqual(flag === false ? null : [['id', 'custom']]);
            expect(inline[1].children?.map((token) => token.content).join('')).toBe(
                flag === false ? 'Hello {name}' : 'Hello',
            );
            if (kind === 'populated') expect(parserVersion).toBe('function');
        },
    );
});

it('keeps custom delimiters and rule suppression through the existing plugin options', async () => {
    const rule = vi.spyOn(yfm024, 'function');
    const errors = await yfmlint('## Heading [#custom]\n', 'custom.md', {
        enableMarkdownAttrs: true,
        pluginOptions: {leftDelimiter: '[', rightDelimiter: ']'},
        lintConfig: {default: false, YFM024: LogLevels.ERROR},
    });
    expect(errors).toEqual([]);
    expect(rule.mock.calls[0][0].parsers.markdownit.tokens[0].attrs).toEqual([['id', 'custom']]);
    expect(
        await yfmlint(
            '<!-- markdownlint-disable YFM024 -->\n## Heading {YFM024=true}\n',
            'suppressed.md',
            {
                enableMarkdownAttrs: true,
                lintConfig: {default: false, YFM024: LogLevels.ERROR},
            },
        ),
    ).toEqual([]);
});

it.each([true, false])(
    'accepts a legacy JavaScript null plugin list with attrs %s',
    async (flag) => {
        const errors = await yfmlint('## Heading {YFM024=true}\n', 'null-plugins.md', {
            // @ts-expect-error JavaScript callers historically pass null despite the array-only type.
            plugins: null,
            enableMarkdownAttrs: flag,
            lintConfig: {default: false, YFM024: LogLevels.ERROR},
        });

        expect(errors).toHaveLength(flag ? 1 : 0);
    },
);
