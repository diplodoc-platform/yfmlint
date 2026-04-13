import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM005', () => {
    it('reports unclosed note block', async () => {
        const input = dedent`
            {% note tip %}

            Body
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Directive \'{% note tip %}\' must be closed] [Context: "{% note tip %}"]',
        ]);
    });

    it('reports unclosed cut block', async () => {
        const input = dedent`
            {% cut "Title" %}

            Body
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Directive \'{% cut "Title" %}\' must be closed] [Context: "{% cut "Title" %}"]',
        ]);
    });

    it('reports unclosed tab list', async () => {
        const input = dedent`
            {% list tabs %}

            Tab content
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Directive \'{% list tabs %}\' must be closed] [Context: "{% list tabs %}"]',
        ]);
    });

    it('reports unclosed if block', async () => {
        const input = dedent`
            {% if var %}

            Content
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Directive \'{% if var %}\' must be closed] [Context: "{% if var %}"]',
        ]);
    });

    it('reports stray closing directive', async () => {
        const input = dedent`
            {% endnote %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Unexpected closing directive \'{% endnote %}\'] [Context: "{% endnote %}"]',
        ]);
    });

    it('accepts properly closed blocks', async () => {
        const input = dedent`
            {% note tip %}

            Note body.

            {% endnote %}

            {% cut "Title" %}

            Cut body.

            {% endcut %}

            {% if user %}

            Hello.

            {% endif %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([]);
    });

    it('reports unclosed changelog block', async () => {
        const input = dedent`
            {% changelog %}

            Content

        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM005 / block-not-closed Block is not properly closed [Directive \'{% changelog %}\' must be closed] [Context: "{% changelog %}"]',
        ]);
    });

    it('reports interleaved note and tabs', async () => {
        const input = dedent`
            {% note info %}

            {% list tabs %}

            {% endnote %}

            {% endlist %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        const interleaved = formatErrors(errors).filter((e) => e.includes('Interleaved'));
        expect(interleaved.length).toBeGreaterThan(0);
        expect(interleaved[0]).toContain('Interleaved directives');
        expect(interleaved[0]).toContain('endnote');
        expect(interleaved[0]).toContain('list tabs');
    });

    it('reports interleaved cut and if', async () => {
        const input = dedent`
            {% cut "Title" %}

            {% if user %}

            {% endcut %}

            {% endif %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        const interleaved = formatErrors(errors).filter((e) => e.includes('Interleaved'));
        expect(interleaved.length).toBeGreaterThan(0);
        expect(interleaved[0]).toContain('endcut');
        expect(interleaved[0]).toContain('if user');
    });

    it('accepts properly nested blocks (no interleaving)', async () => {
        const input = dedent`
            {% note info %}

            {% list tabs %}

            {% endlist %}

            {% endnote %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        const interleaved = formatErrors(errors).filter((e) => e.includes('Interleaved'));
        expect(interleaved).toEqual([]);
    });

    it('ignores directives inside inline code', async () => {
        const input = 'Use `{% note tip %}` and `{% endnote %}` in your docs.';

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM005: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([]);
    });
});
