import {describe, expect, it} from 'vitest';
import table from '@diplodoc/transform/lib/plugins/table';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const tableWithoutCloseToken = dedent`
    #|
    || Cell in column 1, row 1
    |Cell in column 2, row 1 ||

    || Cell in column 1, row 2
    |Cell in column 2, row 2 ||
`;

const tableWithCloseToken = dedent`
    #|
    || Cell in column 1, row 1
    |Cell in column 2, row 1 ||

    || Cell in column 1, row 2
    |Cell in column 2, row 2 ||
    |#
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM004: LogLevels.ERROR,
        },
        plugins: [table],
    });
};

describe('YFM004', () => {
    it('Table without close token', async () => {
        const errors = (await lint(tableWithoutCloseToken, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Table with close token', async () => {
        const errors = (await lint(tableWithCloseToken, 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
