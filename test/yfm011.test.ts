import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const image = dedent`
    ![Image](./image.svg)
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM011: LogLevels.ERROR,
        },
    });
};

describe('YFM011', () => {
    it('Rule does not crash without plugins', async () => {
        const errors = (await lint(image, 'test1.md')) || [];
        // Rule requires plugins to set YFM011 attribute, so no errors without plugins
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Rule is disabled', async () => {
        const errors =
            (await yfmlint(image, 'test2.md', {
                lintConfig: {
                    YFM011: LogLevels.DISABLED,
                },
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
