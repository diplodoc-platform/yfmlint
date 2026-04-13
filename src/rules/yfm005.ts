import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

import {
    CHANGELOG_CLOSE_RE,
    CHANGELOG_OPEN_RE,
    CUT_CLOSE_RE,
    CUT_OPEN_RE,
    FOR_CLOSE_RE,
    FOR_OPEN_RE,
    IF_CLOSE_RE,
    IF_OPEN_RE,
    NOTE_CLOSE_RE,
    NOTE_OPEN_RE,
    TABS_CLOSE_RE,
    TABS_OPEN_RE,
} from './directives';
import {findInterleavedDirectiveIssues, findPairedDirectiveIssues} from './helpers';

const PAIRED_SPECS = [
    {open: NOTE_OPEN_RE, close: NOTE_CLOSE_RE},
    {open: CUT_OPEN_RE, close: CUT_CLOSE_RE},
    {open: TABS_OPEN_RE, close: TABS_CLOSE_RE},
    {open: CHANGELOG_OPEN_RE, close: CHANGELOG_CLOSE_RE},
    {open: IF_OPEN_RE, close: IF_CLOSE_RE},
    {open: FOR_OPEN_RE, close: FOR_CLOSE_RE},
];

export const yfm005: Rule = {
    names: ['YFM005', 'block-not-closed'],
    description: 'Block is not properly closed',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM005(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        let hasPluginSignal = false;

        // Plugin-based detection for tabs (more reliable when plugin is loaded)
        params.parsers.markdownit.tokens
            .filter((token) => token.type === 'paragraph_open')
            .forEach((token) => {
                const tokenWithAttrs = token as unknown as TokenWithAttrs;
                if (tokenWithAttrs.attrGet('YFM005')) {
                    hasPluginSignal = true;
                    onError({
                        lineNumber: token.lineNumber,
                        context: token.line,
                    });
                }
            });

        // Raw scan for all paired blocks (fallback when plugin is not loaded)
        if (!hasPluginSignal) {
            for (const spec of PAIRED_SPECS) {
                findPairedDirectiveIssues(params, spec).forEach((issue) => {
                    onError({
                        lineNumber: issue.lineNumber,
                        detail: issue.detail,
                        context: issue.context,
                    });
                });
            }

            findInterleavedDirectiveIssues(params, PAIRED_SPECS).forEach((issue) => {
                onError({
                    lineNumber: issue.lineNumber,
                    detail: issue.detail,
                    context: issue.context,
                });
            });
        }
    },
};
