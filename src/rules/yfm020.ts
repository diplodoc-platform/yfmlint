import type {Rule} from 'markdownlint';

import {CUT_CLOSE_RE, CUT_OPEN_RE, CUT_STRICT_RE} from './directives';
import {findDirectiveMatches, findPairedDirectiveIssues} from './helpers';

export const yfm020: Rule = {
    names: ['YFM020', 'cut-block-invalid'],
    description: 'Cut block structure is invalid',
    tags: ['cut'],
    parser: 'markdownit',
    function: function YFM020(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        findPairedDirectiveIssues(params, {open: CUT_OPEN_RE, close: CUT_CLOSE_RE}).forEach(
            (issue) => {
                onError({
                    lineNumber: issue.lineNumber,
                    detail: issue.detail,
                    context: issue.context,
                });
            },
        );

        findDirectiveMatches(params).forEach((match) => {
            if (CUT_OPEN_RE.test(match.directive) && !CUT_STRICT_RE.test(match.directive)) {
                onError({
                    lineNumber: match.lineNumber,
                    detail: `Invalid cut syntax. Expected: cut "title"`,
                    context: match.line,
                });
            }
        });
    },
};
