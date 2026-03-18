import type MarkdownIt from 'markdown-it';

import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

function markDfnFromInclude(termNames: string[]) {
    return (md: MarkdownIt) => {
        md.core.ruler.push('test-mark-dfn-from-include', (state) => {
            for (const token of state.tokens) {
                if (token.type !== 'dfn_open') continue;
                const id = token.attrGet('id') || '';
                if (termNames.some((name) => id === `:${name}_element`)) {
                    token.attrSet('from-include', 'true');
                }
            }
        });
    };
}

describe('YFM018', () => {
    it('should fire for term definitions from includes', async () => {
        const input = dedent`
            # Page

            Uses [api](*api).

            [*api]: API definition from include
        `;
        const errors =
            (await yfmlint(input, 'yfm018-fire.md', {
                lintConfig: {YFM018: LogLevels.WARN},
                plugins: [term, markDfnFromInclude(['api'])],
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('should not fire for local term definitions', async () => {
        const input = dedent`
            # Page

            Uses [api](*api).

            [*api]: Local API definition
        `;
        const errors =
            (await yfmlint(input, 'yfm018-local.md', {
                lintConfig: {YFM018: LogLevels.WARN},
                plugins: [term],
            })) || [];
        expect(formatErrors(errors)).toEqual([]);
    });

    it('should fire only for included terms in mixed content', async () => {
        const input = dedent`
            # Page

            Uses [api](*api) and [sdk](*sdk).

            [*api]: API definition from include

            [*sdk]: Local SDK definition
        `;
        const errors =
            (await yfmlint(input, 'yfm018-mixed.md', {
                lintConfig: {YFM018: LogLevels.WARN},
                plugins: [term, markDfnFromInclude(['api'])],
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
