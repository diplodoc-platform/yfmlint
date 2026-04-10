import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM022', () => {
    it('reports unclosed if block', async () => {
        const input = dedent`
            {% if var %}

            Content
        `;

        const errors =
            (await yfmlint(input, 'if-open.md', {
                lintConfig: {YFM022: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'if-open.md: 1: YFM022 / if-block-invalid If block structure is invalid [Directive \'{% if var %}\' must be closed] [Context: "{% if var %}"]',
        ]);
    });

    it('reports stray endif', async () => {
        const input = dedent`
            {% endif %}
        `;

        const errors =
            (await yfmlint(input, 'if-close.md', {
                lintConfig: {YFM022: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'if-close.md: 1: YFM022 / if-block-invalid If block structure is invalid [Unexpected closing directive \'{% endif %}\'] [Context: "{% endif %}"]',
        ]);
    });

    it('accepts properly closed if block', async () => {
        const input = dedent`
            {% if user %}

            Hello

            {% endif %}
        `;

        const errors =
            (await yfmlint(input, 'if-valid.md', {
                lintConfig: {YFM022: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });
});
