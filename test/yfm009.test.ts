import type MarkdownIt from 'markdown-it';

import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const withIncludes = dedent`
    [*widget-popup1]: {% include [ ](./_includes/widget.md) %}

    [*button-popup2]: {% include [ ](./_includes/button) %}

    [*button-popup3]: {% include [ ](./_includes/button) %}
`;

const plainText = dedent`
    [*widget-popup1]: hello world

    hi i am text

    [*widget-popup2]: it's will fail
`;

const appendText = (text: string) => {
    return `${text}\n\nhi i am text after`;
};

const prependText = (text: string) => {
    return `hi i am text before\n\n${text}`;
};

/**
 * Marks specific dfn_open tokens with `from-include` attribute,
 * simulating what happens when term definitions come from included files.
 *
 * @param termNames - term key names whose dfn_open tokens should be marked
 * @returns markdown-it plugin function
 */
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

const lint = (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM009: LogLevels.ERROR,
        },
        plugins: [term],
    });
};

describe('YFM009', () => {
    it('not accepts text between terms', async () => {
        const errors = (await lint(plainText, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('not accepts includes with text after', async () => {
        const errors = (await lint(appendText(withIncludes), 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('accepts includes', async () => {
        const errors = (await lint(withIncludes, 'test3.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('accepts includes with text before', async () => {
        const errors = (await lint(prependText(withIncludes), 'test4.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    describe('duplicate term (__yfm_lint / YFM006) handling', () => {
        const termsWithDuplicate = dedent`
            # Content

            Some text using [term1](*term_a).

            [*term_a]: First definition

            [*term_b]: Another definition

            [*term_a]: Duplicate definition

            [*term_c]: Third definition
        `;

        it('should not fire YFM009 when duplicate lint token is between dfn blocks', async () => {
            const errors =
                (await yfmlint(termsWithDuplicate, 'dup-term.md', {
                    lintConfig: {
                        YFM009: LogLevels.ERROR,
                        YFM006: LogLevels.DISABLED,
                    },
                    plugins: [term],
                })) || [];
            expect(formatErrors(errors)).toEqual([]);
        });

        it('should not fire YFM009 when duplicate is the last term entry', async () => {
            const termsWithDupLast = dedent`
                # Content

                Some text.

                [*term_a]: First definition

                [*term_b]: Another definition

                [*term_a]: Duplicate at end
            `;
            const errors =
                (await yfmlint(termsWithDupLast, 'dup-term-last.md', {
                    lintConfig: {
                        YFM009: LogLevels.ERROR,
                        YFM006: LogLevels.DISABLED,
                    },
                    plugins: [term],
                })) || [];
            expect(formatErrors(errors)).toEqual([]);
        });
    });

    describe('from-include handling', () => {
        const termsFromIncludeInMiddle = dedent`
            # Page content

            Some text using [term1](*term_a) and [term2](*term_b).

            [*term_a]: Definition from include

            [*term_b]: Another definition from include

            ## More content

            Rest of the page.

            [*local_term]: Local definition at end
        `;

        const allTermsFromInclude = dedent`
            # Page content

            Some text using [term1](*term_a).

            [*term_a]: Definition from include

            [*term_b]: Another definition from include
        `;

        it('should not fire when all dfn tokens are from includes', async () => {
            const errors =
                (await yfmlint(allTermsFromInclude, 'from-include-all.md', {
                    lintConfig: {YFM009: LogLevels.ERROR, YFM018: LogLevels.DISABLED},
                    plugins: [term, markDfnFromInclude(['term_a', 'term_b'])],
                })) || [];
            expect(formatErrors(errors)).toEqual([]);
        });

        it('should not fire for local terms at end when included terms are in middle', async () => {
            const errors =
                (await yfmlint(termsFromIncludeInMiddle, 'from-include-mixed.md', {
                    lintConfig: {YFM009: LogLevels.ERROR, YFM018: LogLevels.DISABLED},
                    plugins: [term, markDfnFromInclude(['term_a', 'term_b'])],
                })) || [];
            expect(formatErrors(errors)).toEqual([]);
        });

        it('should still fire for local terms not at end (mixed with included)', async () => {
            const mixedBadLocal = dedent`
                [*local_bad]: This local term is NOT at the end

                Some content after local term.

                [*from_inc]: Definition from include
            `;
            const errors =
                (await yfmlint(mixedBadLocal, 'from-include-bad-local.md', {
                    lintConfig: {YFM009: LogLevels.ERROR, YFM018: LogLevels.DISABLED},
                    plugins: [term, markDfnFromInclude(['from_inc'])],
                })) || [];
            expect(formatErrors(errors)).toMatchSnapshot();
        });
    });
});
