import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM019', () => {
    it('reports unclosed note block', async () => {
        const input = dedent`
            {% note tip %}

            Body
        `;

        const errors =
            (await yfmlint(input, 'note-open.md', {
                lintConfig: {YFM019: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'note-open.md: 1: YFM019 / note-block-invalid Note block structure is invalid [Directive \'{% note tip %}\' must be closed] [Context: "{% note tip %}"]',
        ]);
    });

    it('accepts properly closed note block', async () => {
        const input = dedent`
            # Title

            {% note warning "Beta-функциональность" %}


            Функция находится в состоянии бета.


            {% endnote %}

            Some text after.
        `;

        const errors =
            (await yfmlint(input, 'note-valid.md', {
                lintConfig: {YFM019: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM019'))).toEqual([]);
    });

    it('reports stray endnote', async () => {
        const input = dedent`
            {% endnote %}
        `;

        const errors =
            (await yfmlint(input, 'note-close.md', {
                lintConfig: {YFM019: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'note-close.md: 1: YFM019 / note-block-invalid Note block structure is invalid [Unexpected closing directive \'{% endnote %}\'] [Context: "{% endnote %}"]',
        ]);
    });
});
