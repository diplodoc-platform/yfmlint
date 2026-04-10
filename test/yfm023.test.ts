import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM023', () => {
    it('reports unclosed for block', async () => {
        const input = dedent`
            {% for item in list %}

            Content
        `;

        const errors =
            (await yfmlint(input, 'for-open.md', {
                lintConfig: {YFM023: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'for-open.md: 1: YFM023 / for-block-invalid For block structure is invalid [Directive \'{% for item in list %}\' must be closed] [Context: "{% for item in list %}"]',
        ]);
    });

    it('reports stray endfor', async () => {
        const input = dedent`
            {% endfor %}
        `;

        const errors =
            (await yfmlint(input, 'for-close.md', {
                lintConfig: {YFM023: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'for-close.md: 1: YFM023 / for-block-invalid For block structure is invalid [Unexpected closing directive \'{% endfor %}\'] [Context: "{% endfor %}"]',
        ]);
    });

    it('accepts properly closed for block', async () => {
        const input = dedent`
            {% for item in list %}

            {{ item }}

            {% endfor %}
        `;

        const errors =
            (await yfmlint(input, 'for-valid.md', {
                lintConfig: {YFM023: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });
});
