import type MarkdownIt from 'markdown-it';

import {describe, expect, it, vi} from 'vitest';
import anchors from '@diplodoc/transform/lib/plugins/anchors';
import includes from '@diplodoc/transform/lib/plugins/includes';

import {LogLevels, log, yfmlint} from '../src';

import {formatErrors} from './utils';

const markEmptyAnchors = (md: MarkdownIt) => {
    md.core.ruler.push('mark-empty-custom-anchors', (state) => {
        for (const token of state.tokens) {
            if (token.type === 'heading_open' || token.type === 'paragraph_open') {
                token.attrSet('YFM024', 'true');
            }
        }
    });
};

describe('YFM024', () => {
    describe.each([false, true])('released anchors plugin (includes=%s)', (withIncludes) => {
        const plugins = withIncludes ? [includes, anchors] : [anchors];

        it.each([
            '# Title {# spaced}',
            '## Title {#}',
            '## Title { # }',
            'Setext {# broken}\n---',
            "## Title {title='a # b'}",
        ])('reports an empty terminal shorthand ID: %s', async (source) => {
            const errors = (await yfmlint(source, 'test.md', {plugins})) || [];
            const warnings = errors.filter((error) => error.ruleNames.includes('YFM024'));

            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toMatchObject({
                lineNumber: 1,
                errorContext: source.split('\n')[0],
                level: LogLevels.WARN,
            });
        });

        it.each([
            '## Title {#good}',
            '## Title { #good }',
            '## Title {#good hidden}',
            '## Title {#good data-x}',
            '## Title {#good custom-flag}',
            '## Title {#custom Multiple Words}',
            '## Title {#good .class title="literal # text"}',
            '## Title {#\tvalue}',
            '## Literal `{# bad}`',
            '## Literal `{#bad words}` {#good}',
            '## Literal \\{# bad}',
            '## Use {# x} syntax {#good}',
            '## A {# x} tail',
            'Use {# x} syntax {#good}\n---',
            'A {# x} tail\n---',
            'Paragraph {# bad}',
            '```\n## Code {# bad}\n```',
        ])('does not report valid attributes or literal text: %s', async (source) => {
            const errors = (await yfmlint(source, 'test.md', {plugins})) || [];
            expect(errors.filter((error) => error.ruleNames.includes('YFM024'))).toEqual([]);
        });

        it('preserves source lines and contexts with the real plugin', async () => {
            const errors =
                (await yfmlint(
                    '# Title {# spaced}\n\n## Valid {#id hidden}\n\nSetext {#}\n---',
                    'test.md',
                    {plugins},
                )) || [];
            const warnings = errors.filter((error) => error.ruleNames.includes('YFM024'));

            expect(warnings.map((error) => error.lineNumber)).toEqual([1, 5]);
            expect(warnings.map((error) => error.errorContext)).toEqual([
                '# Title {# spaced}',
                'Setext {#}',
            ]);
        });

        it.each([
            ['## Title [# broken]', 1],
            ['## Use [# x] syntax [#good]', 0],
            ['## A [# x] tail', 0],
        ])('respects custom attribute delimiters: %s', async (source, count) => {
            const errors =
                (await yfmlint(source, 'test.md', {
                    plugins,
                    pluginOptions: {leftDelimiter: '[', rightDelimiter: ']'},
                })) || [];
            expect(errors.filter((error) => error.ruleNames.includes('YFM024'))).toHaveLength(
                count,
            );
        });

        it.each([false, LogLevels.DISABLED, LogLevels.ERROR])(
            'honors configuration with the real plugin: %s',
            async (level) => {
                const errors =
                    (await yfmlint('## Title {# broken}', 'test.md', {
                        plugins,
                        lintConfig: {YFM024: level},
                    })) || [];
                const warnings = errors.filter((error) => error.ruleNames.includes('YFM024'));

                if (level === LogLevels.ERROR) {
                    expect(warnings).toHaveLength(1);
                    expect(warnings[0].level).toBe(LogLevels.ERROR);
                } else {
                    expect(warnings).toEqual([]);
                }
            },
        );
    });

    it('reports marked ATX and setext headings at their source lines', async () => {
        const errors =
            (await yfmlint(
                '# Title {# spaced}\n\nParagraph.\n\n## Section {# two}\n\nSetext {# broken}\n---',
                'test.md',
                {plugins: [markEmptyAnchors]},
            )) || [];
        const warnings = errors.filter((error) => error.ruleNames.includes('YFM024'));

        expect(warnings.map((error) => error.lineNumber)).toEqual([1, 5, 7]);
        expect(warnings.map((error) => error.errorContext)).toEqual([
            '# Title {# spaced}',
            '## Section {# two}',
            'Setext {# broken}',
        ]);
        expect(warnings.every((error) => error.level === LogLevels.WARN)).toBe(true);
        expect(formatErrors(warnings)[0]).toBe(
            'test.md: 1: YFM024 / empty-custom-heading-anchor Custom shorthand heading anchor is empty ' +
                '[Specify a nonempty ID, for example {#section-id}; ' +
                'an empty ID falls back to an automatic anchor] ' +
                '[Context: "# Title {# spaced}"]',
        );
    });

    it('logs the default warning without an error', async () => {
        const errors =
            (await yfmlint('## Title {# spaced}', 'test.md', {
                plugins: [markEmptyAnchors],
            })) || [];
        const logger = {warn: vi.fn(), error: vi.fn(), info: vi.fn()};
        log(errors, logger);
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('supports an explicitly configured error level', async () => {
        const errors =
            (await yfmlint('## Title {# two}', 'test.md', {
                plugins: [markEmptyAnchors],
                lintConfig: {YFM024: LogLevels.ERROR},
            })) || [];
        expect(errors.find((error) => error.ruleNames.includes('YFM024'))?.level).toBe(
            LogLevels.ERROR,
        );
    });

    it.each([false, LogLevels.DISABLED])('can be disabled: %s', async (level) => {
        const errors =
            (await yfmlint('## Title {# spaced}', 'test.md', {
                plugins: [markEmptyAnchors],
                lintConfig: {YFM024: level},
            })) || [];
        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
    });

    it('does not warn without a transform marker, including on older plugins', async () => {
        const errors = (await yfmlint('## Title {#good}', 'test.md', {})) || [];
        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
    });
});
