import {describe, expect, it} from 'vitest';
import term from '@diplodoc/transform/lib/plugins/term';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const withIncludes = dedent`
    [*widget-popup1]: {% include [ ](./_includes/widget.md) %}

    [*button-popup2]: {% include [ ](./_includes/button) %}

    [*button-popup3]: {% include [ ](./_includes/button) %}
`;

const plainText = dedent`
    [*widget-popup1]: hello world

    hi i am text

    [*widget-popup2]: it's will fail
`;

const appendText = (text: string) => {
    return `${text}\n\nhi i am text after`;
};

const prependText = (text: string) => {
    return `hi i am text before\n\n${text}`;
};

const lint = (input: string, path: string) => {
    return yfmlint(input, path, {
        lintConfig: {
            YFM009: LogLevels.ERROR,
        },
        plugins: [term],
    });
};

describe('YFM009', () => {
    it('not accepts text between terms', async () => {
        const errors = (await lint(plainText, 'test1.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('not accepts includes with text after', async () => {
        const errors = (await lint(appendText(withIncludes), 'test2.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('accepts includes', async () => {
        const errors = (await lint(withIncludes, 'test3.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });

    it('accepts includes with text before', async () => {
        const errors = (await lint(prependText(withIncludes), 'test4.md')) || [];
        expect(formatErrors(errors)).toMatchSnapshot();
    });
});
