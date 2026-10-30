import type MarkdownIt from 'markdown-it';

import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const simpleLink = dedent`
    [Link text](./file.md#header)
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM002: LogLevels.ERROR,
        },
    });
};

describe('YFM002', () => {
    it.each([
        ['inline', '[label](guide.md#missing)', 'guide.md#missing'],
        ['same-page', '[label](#missing)', '#missing'],
        ['reference', '[label][ref]\n\n[ref]: guide.md#missing', 'guide.md#missing'],
    ])('reports only the %s link destination in a long paragraph', async (_, link, target) => {
        const marker = (md: MarkdownIt) => {
            md.core.ruler.push('mark-missing-anchors', (state) => {
                for (const inline of state.tokens) {
                    for (const child of inline.children || []) {
                        if (child.type === 'link_open') {
                            child.attrSet('YFM002', 'missing');
                        }
                    }
                }
            });
        };
        const errors = await yfmlint('Long paragraph '.repeat(10000) + link, 'index.md', {
            plugins: [marker],
            lintConfig: {default: false, YFM002: LogLevels.WARN},
        });

        expect(errors).toHaveLength(1);
        expect(errors?.[0].errorContext).toBe(target);
        expect(errors?.[0].lineNumber).toBe(1);
    });

    it('Rule does not crash without plugins', async () => {
        const errors = (await lint(simpleLink, 'test1.md')) || [];
        // Rule requires plugins to set YFM002 attribute, so no errors without plugins
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Rule is disabled', async () => {
        const errors =
            (await yfmlint(simpleLink, 'test2.md', {
                lintConfig: {
                    YFM002: LogLevels.DISABLED,
                },
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
