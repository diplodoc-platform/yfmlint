import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const termInsideDefinition = dedent`
    [term1]: This definition contains [term2] which is not allowed.

    [term2]: Another definition
`;

const termWithoutNestedTerm = dedent`
    [term1]: This definition does not contain other terms.

    [term2]: Another definition
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM008: LogLevels.ERROR,
        },
        plugins: [term],
    });
};

describe('YFM008', () => {
    it('Term inside definition not allowed', async () => {
        const errors = (await lint(termInsideDefinition, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Term definition without nested term', async () => {
        const errors = (await lint(termWithoutNestedTerm, 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
