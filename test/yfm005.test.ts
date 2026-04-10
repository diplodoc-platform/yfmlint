import {describe, expect, it} from 'vitest';
import tabs from '@diplodoc/transform/lib/plugins/tabs';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const tabListWithoutClose = dedent`
    {% list tabs %}

    Tab 1 content

    Tab 2 content
`;

const tabListWithClose = dedent`
    {% list tabs %}

    Tab 1 content

    Tab 2 content
    {% endlist %}
`;

const lint = async (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM005: LogLevels.ERROR,
        },
        plugins: [tabs],
    });
};

describe('YFM005', () => {
    it('Tab list without close token', async () => {
        const errors = (await lint(tabListWithoutClose, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('Tab list with close token', async () => {
        const errors = (await lint(tabListWithClose, 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('falls back to raw directive parsing without tabs plugin', async () => {
        const errors =
            (await yfmlint(tabListWithoutClose, 'test3.md', {
                lintConfig: {
                    YFM005: LogLevels.ERROR,
                },
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'test3.md: 1: YFM005 / tab-list-not-closed Tab list not closed [Directive \'{% list tabs %}\' must be closed] [Context: "{% list tabs %}"]',
        ]);
    });
});
