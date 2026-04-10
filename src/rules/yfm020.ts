import type {Rule} from 'markdownlint';

import {CUT_CLOSE_RE, CUT_OPEN_RE} from './directives';
import {findPairedDirectiveIssues} from './helpers';

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
    },
};
