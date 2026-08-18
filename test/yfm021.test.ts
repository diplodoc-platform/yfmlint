import type MarkdownIt from 'markdown-it';

import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';
import anchors from '@diplodoc/transform/lib/plugins/anchors';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

const markEmptyAutomaticAnchors = (md: MarkdownIt) => {
    md.core.ruler.push('mark-empty-automatic-anchors', (state) => {
        state.tokens
            .filter((token) => token.type === 'heading_open')
            .forEach((token) => token.attrSet('YFM021', 'true'));
    });
};

describe('YFM021', () => {
    it('reports marked ATX and setext headings', async () => {
        const input = dedent`
            ## 😀

            ## ☕

            中文
            ---
        `;

        const errors =
            (await yfmlint(input, 'test.md', {
                plugins: [markEmptyAutomaticAnchors],
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors)).toEqual([
            'test.md: 1: YFM021 / empty-auto-heading-anchor Automatic heading anchor is empty [Automatic anchor cannot be generated from the heading text; add an explicit anchor such as {#section-id}] [Context: "## 😀"]',
            'test.md: 3: YFM021 / empty-auto-heading-anchor Automatic heading anchor is empty [Automatic anchor cannot be generated from the heading text; add an explicit anchor such as {#section-id}] [Context: "## ☕"]',
            'test.md: 5: YFM021 / empty-auto-heading-anchor Automatic heading anchor is empty [Automatic anchor cannot be generated from the heading text; add an explicit anchor such as {#section-id}] [Context: "中文"]',
        ]);
    });

    it('reports every marked heading', async () => {
        const input = dedent`
            ## 😀

            ## 🚀
        `;

        const errors =
            (await yfmlint(input, 'test.md', {
                plugins: [markEmptyAutomaticAnchors],
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        const filtered = formatErrors(errors).filter((e) => e.includes('YFM021'));

        expect(filtered).toHaveLength(2);
        expect(filtered[0]).toContain('test.md: 1:');
        expect(filtered[1]).toContain('test.md: 3:');
    });

    it('integrates with the anchors plugin', async () => {
        const input = dedent`
            ## 😀

            ## 😀 {#emoji-section}
        `;

        const errors =
            (await yfmlint(input, 'test.md', {
                plugins: [anchors],
                pluginOptions: {extractTitle: true},
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors).filter((error) => error.includes('YFM021'))).toEqual([
            'test.md: 1: YFM021 / empty-auto-heading-anchor Automatic heading anchor is empty [Automatic anchor cannot be generated from the heading text; add an explicit anchor such as {#section-id}] [Context: "## 😀"]',
        ]);
    });

    it('does not report emoji outside broken automatic heading anchors', async () => {
        const input = dedent`
            # 😀

            Body 😀 text.

            ## Release 🚀 notes

            ## 😀 {#emoji-section}

            \`\`\`
            ## 😀
            \`\`\`
        `;

        const errors =
            (await yfmlint(input, 'test.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors).filter((error) => error.includes('YFM021'))).toEqual([]);
    });

    it('is enabled by default as a warning', async () => {
        const errors =
            (await yfmlint('## 😀', 'test.md', {
                plugins: [markEmptyAutomaticAnchors],
                lintConfig: {},
            })) || [];

        const logs = errors.filter(
            (error) => error.ruleNames.includes('YFM021') && error.level === LogLevels.WARN,
        );

        expect(logs).toHaveLength(1);
    });

    it('supports overriding the default log level', async () => {
        const errors =
            (await yfmlint('## 😀', 'test.md', {
                plugins: [markEmptyAutomaticAnchors],
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        const logs = errors.filter(
            (error) => error.ruleNames.includes('YFM021') && error.level === LogLevels.ERROR,
        );

        expect(logs).toHaveLength(1);
    });

    it('does not report without the anchors plugin', async () => {
        const errors =
            (await yfmlint('## 😀', 'test.md', {
                lintConfig: {YFM021: LogLevels.ERROR},
            })) || [];

        expect(formatErrors(errors).filter((error) => error.includes('YFM021'))).toEqual([]);
    });

    it('can be disabled via config', async () => {
        const errors =
            (await yfmlint('## 😀', 'test.md', {
                plugins: [markEmptyAutomaticAnchors],
                lintConfig: {YFM021: LogLevels.DISABLED},
            })) || [];

        expect(formatErrors(errors).filter((e) => e.includes('YFM021'))).toEqual([]);
    });
});
