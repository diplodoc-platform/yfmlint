import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const duplicatedTerm = dedent`
    [term]: first definition

    [term]: second definition
`;

const uniqueTerms = dedent`
    [term1]: first definition

    [term2]: second definition
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM006: LogLevels.ERROR,
        },
        plugins: [term],
    });
};

describe('YFM006', () => {
    it('Duplicated term definition', async () => {
        const errors = (await lint(duplicatedTerm, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Unique term definitions', async () => {
        const errors = (await lint(uniqueTerms, 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
