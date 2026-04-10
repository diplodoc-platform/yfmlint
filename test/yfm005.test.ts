import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const tabListWithoutClose = dedent`
    {% list tabs %}

    Tab 1 content

    Tab 2 content
`;

describe('YFM005', () => {
    it('reports unclosed tab list', async () => {
        const errors =
            (await yfmlint(tabListWithoutClose, 'test.md', {
                lintConfig: {YFM005: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / tab-list-not-closed Tab list not closed [Directive \'{% list tabs %}\' must be closed] [Context: "{% list tabs %}"]',
        ]);
    });

    it('accepts properly closed tab list', async () => {
        const input = dedent`
            {% list tabs %}

            - Tab 1

              Content

            {% endlist %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {
                lintConfig: {YFM005: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });

    it('reports invalid tabs variant', async () => {
        const input = dedent`
            {% list tabs rado %}

            - Tab 1

              Content

            {% endlist %}
        `;

        const errors =
            (await yfmlint(input, 'tabs-syntax.md', {
                lintConfig: {YFM005: LogLevels.ERROR},
            })) || [];

        const syntaxErrors = formatErrors(errors).filter((e) => e.includes('Invalid tabs syntax'));
        expect(syntaxErrors).toHaveLength(1);
        expect(syntaxErrors[0]).toContain('Expected: list tabs (regular|radio|dropdown|accordion)');
    });
});
