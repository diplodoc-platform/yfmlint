import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM020', () => {
    it('reports unclosed cut block', async () => {
        const input = dedent`
            {% cut "Title" %}

            Body
        `;

        const errors =
            (await yfmlint(input, 'cut-open.md', {
                lintConfig: {YFM020: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'cut-open.md: 1: YFM020 / cut-block-invalid Cut block structure is invalid [Directive \'{% cut "Title" %}\' must be closed] [Context: "{% cut "Title" %}"]',
        ]);
    });

    it('ignores directives inside inline code', async () => {
        const input = 'Use `{% cut "Title" %}` and `{% endcut %}` for spoilers.';

        const errors =
            (await yfmlint(input, 'cut-inline.md', {
                lintConfig: {YFM020: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });

    it('reports stray endcut', async () => {
        const input = dedent`
            {% endcut %}
        `;

        const errors =
            (await yfmlint(input, 'cut-close.md', {
                lintConfig: {YFM020: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'cut-close.md: 1: YFM020 / cut-block-invalid Cut block structure is invalid [Unexpected closing directive \'{% endcut %}\'] [Context: "{% endcut %}"]',
        ]);
    });
});
