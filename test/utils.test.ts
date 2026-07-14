import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, normalizeConfig, yfmlint} from '../src';

// Markdown that violates two standard markdownlint rules:
// - MD018 (no-space-after-hash): heading without a space after `#`
// - MD010 (no-hard-tabs): a line indented with a real TAB character
// The tab is injected via an explicit `\t` escape so it can't be lost to
// editor/prettier reformatting (unlike a tab stored in a fixture file).
const reproInput = ['#Heading without space', '', '\tLine indented with a hard tab', ''].join('\n');

describe('normalizeConfig', () => {
    it('normalizes boolean, string and object rule forms to {loglevel}', () => {
        const config = normalizeConfig({
            MD001: true,
            MD002: false,
            MD003: LogLevels.ERROR,
            YFM001: {level: LogLevels.WARN, maximum: 80},
        });

        expect(config.MD001).toEqual({loglevel: LogLevels.WARN});
        // `false` (disabled) is simplified back to `false`
        expect(config.MD002).toBe(false);
        expect(config.MD003).toEqual({loglevel: LogLevels.ERROR});
        expect(config.YFM001).toEqual({loglevel: LogLevels.WARN, maximum: 80});
    });

    // Regression: config is normalized twice (once in the CLI Lint feature,
    // once inside yfmlint). An already-normalized `{loglevel: 'error'}` has no
    // `.level`, so the second pass used to fall back to the default WARN,
    // silently downgrading errors and letting the build pass.
    it('is idempotent for an already-normalized config', () => {
        const once = normalizeConfig({MD010: LogLevels.ERROR, MD018: LogLevels.ERROR});
        const twice = normalizeConfig(once);

        expect(twice).toEqual(once);
        expect((twice.MD010 as {loglevel: LogLevels}).loglevel).toBe(LogLevels.ERROR);
        expect((twice.MD018 as {loglevel: LogLevels}).loglevel).toBe(LogLevels.ERROR);
    });

    it('preserves extra object rule fields (e.g. YFM001.maximum) on re-normalization', () => {
        const once = normalizeConfig({YFM001: {level: LogLevels.ERROR, maximum: 80}});
        const twice = normalizeConfig(once);

        expect(twice.YFM001).toEqual({loglevel: LogLevels.ERROR, maximum: 80});
    });
});

describe('yfmlint log levels', () => {
    it('keeps MD010/MD018 at error level when config was pre-normalized (CLI flow)', async () => {
        // Simulate the CLI flow: config already normalized before reaching yfmlint.
        const preNormalized = normalizeConfig({
            MD010: LogLevels.ERROR,
            MD018: LogLevels.ERROR,
        });

        const errors =
            (await yfmlint(reproInput, 'repro.md', {
                lintConfig: preNormalized,
            })) || [];

        const byRule = (name: string) => errors.filter((e) => e.ruleNames.includes(name));

        expect(byRule('MD010').length).toBeGreaterThan(0);
        expect(byRule('MD018').length).toBeGreaterThan(0);

        for (const error of [...byRule('MD010'), ...byRule('MD018')]) {
            expect(error.level).toBe(LogLevels.ERROR);
        }
    });

    it('honours a raw (not pre-normalized) rule level too', async () => {
        const errors =
            (await yfmlint(
                dedent`
                #Heading without space
            `,
                'raw.md',
                {
                    lintConfig: {MD018: LogLevels.ERROR},
                },
            )) || [];

        const md018 = errors.filter((e) => e.ruleNames.includes('MD018'));

        expect(md018.length).toBeGreaterThan(0);
        expect(md018[0].level).toBe(LogLevels.ERROR);
    });
});
