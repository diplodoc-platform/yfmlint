import {describe, expect, it} from 'vitest';
import dedent from 'ts-dedent';

import {LogLevels, yfmlint} from '../src';

import {formatErrors} from './utils';

describe('YFM023', () => {
    it.each(['human', 'agent'])('accepts the %s audience', async (audience) => {
        const input = `:::visibility ${audience}\nContent.\n:::`;
        const errors = (await yfmlint(input, 'test.md', {})) || [];

        expect(formatErrors(errors).filter((error) => error.includes('YFM023'))).toEqual([]);
    });

    it.each([
        ['a missing audience', ':::visibility'],
        ['an unknown audience', ':::visibility robot'],
        ['the deprecated plural audience', ':::visibility agents'],
        ['additional arguments', ':::visibility agent extra'],
    ])('reports %s as an error', async (_case, opening) => {
        const input = `${opening}\nHidden content.\n:::`;
        const errors = (await yfmlint(input, 'test.md', {})) || [];
        const visibilityError = errors.find((error) => error.ruleNames.includes('YFM023'));

        expect(visibilityError?.level).toBe(LogLevels.ERROR);
        expect(String(visibilityError)).toContain(
            'Expected: :::visibility human or :::visibility agent',
        );
    });

    it('ignores examples inside fenced code blocks', async () => {
        const input = dedent`
            \`\`\`markdown
            :::visibility robots
            Example content.
            :::
            \`\`\`
        `;
        const errors = (await yfmlint(input, 'test.md', {})) || [];

        expect(formatErrors(errors).filter((error) => error.includes('YFM023'))).toEqual([]);
    });
});
