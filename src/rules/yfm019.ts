import type {Rule} from 'markdownlint';

import {NOTE_CLOSE_RE, NOTE_OPEN_RE, NOTE_STRICT_RE} from './directives';
import {findDirectiveMatches, findPairedDirectiveIssues} from './helpers';

export const yfm019: Rule = {
    names: ['YFM019', 'note-block-invalid'],
    description: 'Note block structure is invalid',
    tags: ['note'],
    parser: 'markdownit',
    function: function YFM019(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        findPairedDirectiveIssues(params, {open: NOTE_OPEN_RE, close: NOTE_CLOSE_RE}).forEach(
            (issue) => {
                onError({
                    lineNumber: issue.lineNumber,
                    detail: issue.detail,
                    context: issue.context,
                });
            },
        );

        findDirectiveMatches(params).forEach((match) => {
            if (NOTE_OPEN_RE.test(match.directive) && !NOTE_STRICT_RE.test(match.directive)) {
                onError({
                    lineNumber: match.lineNumber,
                    detail: `Invalid note syntax. Expected: note (info|tip|warning|alert) ["title"]`,
                    context: match.line,
                });
            }
        });
    },
};
