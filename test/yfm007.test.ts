import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const termWithoutDefinition = dedent`
    This text uses [term] but no definition is provided.
`;

const termWithDefinition = dedent`
    This text uses [term] and definition is provided.

    [term]: term definition
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM007: LogLevels.ERROR,
        },
        plugins: [term],
    });
};

describe('YFM007', () => {
    it('Term used without definition', async () => {
        const errors = (await lint(termWithoutDefinition, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Term used with definition', async () => {
        const errors = (await lint(termWithDefinition, 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
