import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM021', () => {
    it('reports emoji (non-BMP character)', async () => {
        const input = 'Hello 😀 world';

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM021: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM021 / no-non-bmp-characters UTF-16 surrogate-pair character may break layout in some browsers [Character U+1F600 \'😀\' is outside the Basic Multilingual Plane (UTF-16 surrogate pair) at column 7 and may break layout in some browsers] [Context: "Hello 😀 world"]',
        ]);
    });

    it('reports multiple non-BMP characters on different lines', async () => {
        const input = dedent`
            First line 𝕏

            Second line 🚀
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM021: LogLevels.ERROR}})) || [];

        const filtered = formatErrors(errors).filter((e) => e.includes('YFM021'));

        expect(filtered).toHaveLength(2);
        expect(filtered[0]).toContain('test.md: 1:');
        expect(filtered[0]).toContain('U+1D54F');
        expect(filtered[1]).toContain('test.md: 3:');
        expect(filtered[1]).toContain('U+1F680');
    });

    it('reports errors with ERROR log level', async () => {
        const input = 'Broken 𝐀';

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM021: LogLevels.ERROR}})) || [];

        const logs = errors.filter((error) => error.level === LogLevels.ERROR);

        expect(logs).toHaveLength(1);
    });

    it('does not report regular BMP characters (latin, cyrillic, punctuation)', async () => {
        const input = dedent`
            Обычный текст with regular ASCII — and «typographic» quotes.

            Символы вне ASCII: é, ñ, ü, ©, ®, №.
        `;

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM021: LogLevels.ERROR}})) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM021'))).toEqual([]);
    });

    it('is enabled by default as an error', async () => {
        const input = 'Emoji 😀';

        const errors = (await yfmlint(input, 'test.md', {lintConfig: {}})) || [];

        const logs = errors.filter((error) => error.level === LogLevels.ERROR);

        expect(logs).toHaveLength(1);
    });

    it('can be disabled via config', async () => {
        const input = 'Emoji 😀';

        const errors =
            (await yfmlint(input, 'test.md', {lintConfig: {YFM021: LogLevels.DISABLED}})) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM021'))).toEqual([]);
    });
});
