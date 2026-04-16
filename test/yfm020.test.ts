import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM020', () => {
    it('reports unknown directive', async () => {
        const input = dedent`
            {% lis %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM020 / invalid-yfm-directive YFM directive is unknown or has invalid syntax [Unknown or invalid directive \'{% lis %}\'] [Context: "{% lis %}"]',
        ]);
    });

    it('reports invalid note type', async () => {
        const input = dedent`
            {% note warni "ddd" %}

            Body.

            {% endnote %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM020 / invalid-yfm-directive YFM directive is unknown or has invalid syntax [Invalid note syntax. Valid types: info, tip, warning, alert] [Context: "{% note warni "ddd" %}"]',
        ]);
    });

    it('reports invalid tabs variant', async () => {
        const input = dedent`
            {% list tabs rado %}

            - Tab

            {% endlist %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM020 / invalid-yfm-directive YFM directive is unknown or has invalid syntax [Invalid tabs syntax. Valid variants: regular, radio, dropdown, accordion] [Context: "{% list tabs rado %}"]',
        ]);
    });

    it('reports invalid include syntax', async () => {
        const input = dedent`
            {% include file.md %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM020 / invalid-yfm-directive YFM directive is unknown or has invalid syntax [Invalid include syntax. Expected: include [text](path) or include notitle [text](path)] [Context: "{% include file.md %}"]',
        ]);
    });

    it('accepts valid include syntax', async () => {
        const input = dedent`
            {% include [My file](./file.md) %}

            {% include notitle [Section](./file.md#section) %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM020'))).toEqual([]);
    });

    it('accepts note with quoted title containing inner quotes', async () => {
        const input = dedent`
            {% note info "Предотвращение "колебаний" качества" %}

            Body.

            {% endnote %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM020'))).toEqual([]);
    });

    it('does not report valid known directives', async () => {
        const input = dedent`
            {% note tip %}

            {% endnote %}

            {% cut "Title" %}

            {% endcut %}

            {% anchor my-id %}

            {% file src="data:text/plain;base64,Cg==" name="empty.txt" %}

            {% if var %}

            {% endif %}

            {% for item in list %}

            {% endfor %}

            {% include [text](./file.md) %}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM020'))).toEqual([]);
    });

    it('ignores directives inside inline code', async () => {
        const input = 'Use `{% include %}` to include files and `{% list tabs %}` for tabs.';

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([]);
    });

    it('ignores directives inside fenced code blocks', async () => {
        const input = dedent`
            \`\`\`markdown
            {% lis %}
            \`\`\`
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM020: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([]);
    });
});
