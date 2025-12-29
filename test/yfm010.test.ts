import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const linkWithAnchor = dedent`
    # Title

    [Link to anchor](#anchor)
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM010: LogLevels.ERROR,
        },
    });
};

describe('YFM010', () => {
    it('Rule does not crash without plugins', async () => {
        const errors = (await lint(linkWithAnchor, 'test1.md')) || [];
        // Rule requires plugins to set YFM010 attribute, so no errors without plugins
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Rule is disabled', async () => {
        const errors =
            (await yfmlint(linkWithAnchor, 'test2.md', {
                lintConfig: {
                    YFM010: LogLevels.DISABLED,
                },
            })) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
