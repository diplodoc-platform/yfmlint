import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const simpleLink = dedent`
    [Link text](./file.md)
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM003: LogLevels.ERROR,
        },
    });
};

describe('YFM003', () => {
    it('Rule does not crash without plugins', async () => {
        const errors = (await lint(simpleLink, 'test1.md')) || [];
        // Rule requires plugins to set YFM003 attribute, so no errors without plugins
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Rule is disabled', async () => {
        const errors =
            (await yfmlint(simpleLink, 'test2.md', {
                lintConfig: {
                    YFM003: LogLevels.DISABLED,
                },
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
