import type MarkdownIt from 'markdown-it';

import {describe, expect, it, vi} from 'vitest';

import {LogLevels, log, yfmlint} from '../src';

import {formatErrors} from './utils';

const markMalformedAnchors = (md: MarkdownIt) => {
    md.core.ruler.push('mark-malformed-custom-anchors', (state) => {
        for (const token of state.tokens) {
            if (token.type === 'heading_open' || token.type === 'paragraph_open') {
                token.attrSet('YFM024', 'true');
            }
        }
    });
};

describe('YFM024', () => {
    it('reports marked ATX and setext headings at their source lines', async () => {
        const errors =
            (await yfmlint(
                '# Title {# spaced}\n\nParagraph.\n\n## Section {#two words}\n\nSetext {# broken}\n---',
                'test.md',
                {plugins: [markMalformedAnchors]},
            )) || [];
        const warnings = errors.filter((error) => error.ruleNames.includes('YFM024'));

        expect(warnings.map((error) => error.lineNumber)).toEqual([1, 5, 7]);
        expect(warnings.map((error) => error.errorContext)).toEqual([
            '# Title {# spaced}',
            '## Section {#two words}',
            'Setext {# broken}',
        ]);
        expect(warnings.every((error) => error.level === LogLevels.WARN)).toBe(true);
        expect(formatErrors(warnings)[0]).toBe(
            'test.md: 1: YFM024 / malformed-custom-heading-anchor Custom heading anchor has ambiguous whitespace ' +
                '[Use {#section-id} without a space after # or bare words in the ID; ' +
                'an empty ID falls back to an automatic anchor, while a multi-word ID uses its first word] ' +
                '[Context: "# Title {# spaced}"]',
        );
    });

    it('logs the default warning without an error', async () => {
        const errors =
            (await yfmlint('## Title {# spaced}', 'test.md', {
                plugins: [markMalformedAnchors],
            })) || [];
        const logger = {warn: vi.fn(), error: vi.fn(), info: vi.fn()};
        log(errors, logger);
        expect(logger.warn).toHaveBeenCalledOnce();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('supports an explicitly configured error level', async () => {
        const errors =
            (await yfmlint('## Title {#two words}', 'test.md', {
                plugins: [markMalformedAnchors],
                lintConfig: {YFM024: LogLevels.ERROR},
            })) || [];
        expect(errors.find((error) => error.ruleNames.includes('YFM024'))?.level).toBe(
            LogLevels.ERROR,
        );
    });

    it.each([false, LogLevels.DISABLED])('can be disabled: %s', async (level) => {
        const errors =
            (await yfmlint('## Title {# spaced}', 'test.md', {
                plugins: [markMalformedAnchors],
                lintConfig: {YFM024: level},
            })) || [];
        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
    });

    it('does not warn without a transform marker, including on older plugins', async () => {
        const errors = (await yfmlint('## Title {#good}', 'test.md', {})) || [];
        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
    });
});
