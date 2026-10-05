import type MarkdownIt from 'markdown-it';
import type {RawLintConfig} from '../src';

import {describe, expect, it} from 'vitest';

import {LogLevels, yfmlint} from '../src';

const links = '[Missing](page.md#missing)\n\n[Legacy](page.md#legacy)';

function markMissingAnchors(md: MarkdownIt) {
    md.core.ruler.push('test-anchor-validation', (state) => {
        for (const inline of state.tokens) {
            for (const token of inline.children || []) {
                if (token.type !== 'link_open') {
                    continue;
                }
                if (token.attrGet('href') === 'page.md#missing') {
                    token.attrSet('YFM024', 'anchor-not-found');
                } else if (token.attrGet('href') === 'page.md#legacy') {
                    token.attrSet('YFM002', 'legacy-diagnostic');
                }
            }
        }
    });
}

async function lint(lintConfig: RawLintConfig = {}, content = links) {
    return (await yfmlint(content, 'test.md', {plugins: [markMissingAnchors], lintConfig})) || [];
}

describe('YFM024', () => {
    it('warns independently of the legacy YFM002 error level', async () => {
        const errors = await lint({YFM002: LogLevels.ERROR});
        const anchorWarning = errors.find((error) => error.ruleNames.includes('YFM024'));
        const legacyError = errors.find((error) => error.ruleNames.includes('YFM002'));

        expect(anchorWarning?.level).toBe(LogLevels.WARN);
        expect(anchorWarning?.lineNumber).toBe(1);
        expect(String(anchorWarning)).toBe(
            'test.md: 1: YFM024 / missing-local-anchor Local link anchor is missing in the target document [Context: "[Missing](page.md#missing)"]',
        );
        expect(legacyError?.level).toBe(LogLevels.ERROR);
    });

    it('keeps YFM024 enabled when YFM002 is disabled', async () => {
        const errors = await lint({YFM002: false});

        expect(errors.map((error) => error.ruleNames[0])).toEqual(['YFM024']);
    });

    it.each([LogLevels.WARN, LogLevels.ERROR, LogLevels.INFO])(
        'uses the configured level %s',
        async (level) => {
            const errors = await lint({YFM024: level});

            expect(errors.find((error) => error.ruleNames.includes('YFM024'))?.level).toBe(level);
        },
    );

    it.each([false, LogLevels.DISABLED])('can be disabled with %s', async (level) => {
        const errors = await lint({YFM002: LogLevels.ERROR, YFM024: level});

        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
        expect(errors.find((error) => error.ruleNames.includes('YFM002'))?.level).toBe(
            LogLevels.ERROR,
        );
    });

    it('respects an inline disable comment for its own code', async () => {
        const errors = await lint({}, '<!-- markdownlint-disable YFM024 -->\n\n' + links);

        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
        expect(errors.some((error) => error.ruleNames.includes('YFM002'))).toBe(true);
    });

    it('does not report anchors without a validation plugin', async () => {
        const errors = (await yfmlint(links, 'test.md', {})) || [];

        expect(errors.some((error) => error.ruleNames.includes('YFM024'))).toBe(false);
    });
});
