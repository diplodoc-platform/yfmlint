import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';
import visibility from '@diplodoc/transform/lib/plugins/visibility';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM023', () => {
    const lint = async (input: string) =>
        (await yfmlint(input, 'test.md', {plugins: [visibility]})) || [];

    it.each([
        ':::visibility human',
        ':::visibility agent',
        '::::visibility agent',
        '::: visibility agent',
        ':::Visibility agent',
        ':::visibility agent :::',
    ])('accepts parser-recognized opener %s', async (opening) => {
        const errors = await lint(`${opening}\nContent.\n:::`);

        expect(formatErrors(errors).filter((error) => error.includes('YFM023'))).toEqual([]);
    });

    it.each([
        ['a missing audience', ':::visibility'],
        ['an unknown audience', ':::visibility robot'],
        ['the deprecated plural audience', ':::visibility agents'],
        ['additional arguments', ':::visibility agent extra'],
        ['spaces after the marker', '::: visibility robots'],
        ['four marker characters', '::::visibility robots'],
        ['case-insensitive directive name', ':::Visibility robots'],
        ['a non-breaking trailing space', ':::visibility agent\u00a0'],
    ])('reports %s as an error', async (_case, opening) => {
        const input = `${opening}\nHidden content.\n:::`;
        const errors = await lint(input);
        const visibilityError = errors.find((error) => error.ruleNames.includes('YFM023'));

        expect(visibilityError?.level).toBe(LogLevels.ERROR);
        expect(String(visibilityError)).toContain(
            'Expected: :::visibility human or :::visibility agent',
        );
    });

    it.each([
        ['an opener attached to a paragraph', 'Text.\n:::visibility agent\nAgent content.\n:::'],
        ['an opener without a closing marker', ':::visibility agent\nAgent content.'],
    ])('reports %s that the parser did not recognize', async (_case, input) => {
        const errors = await lint(input);

        expect(errors.some((error) => error.ruleNames.includes('YFM023'))).toBe(true);
    });

    it('ignores examples inside fenced code blocks', async () => {
        const input = dedent`
            \`\`\`markdown
            :::visibility robots
            Example content.
            :::
            \`\`\`
        `;
        const errors = await lint(input);

        expect(formatErrors(errors).filter((error) => error.includes('YFM023'))).toEqual([]);
    });
});
