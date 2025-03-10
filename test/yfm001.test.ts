import {describe, expect, it} from 'vitest';
import merge from 'lodash/merge';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const testInput = dedent`
    \`single-line inline code\` \`another single-line inline code\`

    \`
    multi-line inline code
    \`

    \`
    another multi-line
    inline code
    \`

    \`|\`

    \`\`\`
    prefix \`inline quotes inside block code\` postfix
    prefix \`another inline quotes inside block code\` postfix
    \`\`\`

    \`\`\`sql
    block code
    \`\`\`

        \`\`\`sql
        indented block code
        \`\`\`

    \`, ?, !

    Some text for testing not escaped and not closed quote
    \`
`;

const lintConfig = {
    YFM002: LogLevels.DISABLED,
};

describe('YFM001', () => {
    it('All inline codes are shorter than value', async () => {
        const errors =
            (await yfmlint(testInput, 'test1.md', {
                lintConfig,
            })) || [];

        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('All inline codes are longer than value', async () => {
        const errors =
            (await yfmlint(testInput, 'test2.md', {
                lintConfig: {...lintConfig, YFM001: {maximum: 5}},
            })) || [];

        const logs = errors.filter((error) => error.level === LogLevels.WARN);

        expect(formatErrors(logs)).toMatchSnapshot();
    });

    it('Change log level', async () => {
        const errors =
            (await yfmlint(testInput, 'test3.md', {
                lintConfig: merge({}, lintConfig, {
                    YFM001: {maximum: 5, level: LogLevels.ERROR},
                }),
            })) || [];

        const logs = errors.filter((error) => error.level === LogLevels.ERROR);

        expect(formatErrors(logs)).toMatchSnapshot();
    });
});
