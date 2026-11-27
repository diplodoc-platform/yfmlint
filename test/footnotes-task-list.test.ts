import footnotes from '@diplodoc/transform/plugins/footnotes';
import taskList from '@diplodoc/transform/plugins/task-list';
import {afterEach, expect, it, vi} from 'vitest';

import {LogLevels, yfmlint} from '../src';
import {yfm024} from '../src/rules/yfm024';

afterEach(() => vi.restoreAllMocks());

it.each([false, true])(
    'parses footnotes and tasks in the real lint flow with attrs=%s',
    async (enableMarkdownAttrs) => {
        const rule = vi.spyOn(yfm024, 'function');
        const generateID = vi.fn(() => 'must-not-be-allocated');
        const source = '# Heading\n\n- [x] Task with reference[^a]\n\n[^a]: Footnote body.\n';
        const errors = await yfmlint(source, 'source.md', {
            plugins: [footnotes, taskList],
            pluginOptions: {generateID},
            enableMarkdownAttrs,
            lintConfig: {default: false, YFM024: LogLevels.ERROR},
        });
        expect(errors).toEqual([]);
        const tokens = rule.mock.calls[0][0].parsers.markdownit.tokens;
        const inlineTypes = tokens.flatMap(
            (token) => token.children?.map((child) => child.type) ?? [],
        );
        expect(inlineTypes).toContain('footnote_ref');
        expect(inlineTypes).toContain('checkbox_input');
        expect(tokens.some((token) => token.type === 'footnote_block_open')).toBe(true);
        expect(generateID).not.toHaveBeenCalled();
    },
);
