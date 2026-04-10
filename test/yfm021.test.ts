import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM021', () => {
    it('reports unknown directive', async () => {
        const input = dedent`
            {% lis %}
        `;

        const errors =
            (await yfmlint(input, 'invalid-directive.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'invalid-directive.md: 1: YFM021 / invalid-yfm-directive YFM directive is unknown or has invalid syntax [Unknown or invalid directive \'{% lis %}\'] [Context: "{% lis %}"]',
        ]);
    });

    it('does not report known directives', async () => {
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

            {% note "invalid but still note" %}

            {% endnote %}

            {% cut %}

            {% endcut %}
        `;

        const errors =
            (await yfmlint(input, 'known-directives.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM021'))).toEqual([]);
    });

    it('ignores directives inside inline code', async () => {
        const input = 'Use `{% include %}` to include files and `{% list tabs %}` for tabs.';

        const errors =
            (await yfmlint(input, 'inline-code.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });

    it('ignores directives inside fenced code blocks', async () => {
        const input = dedent`
            \`\`\`markdown
            {% lis %}
            \`\`\`
        `;

        const errors =
            (await yfmlint(input, 'code-sample.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([]);
    });
});
