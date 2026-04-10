import type {Rule} from 'markdownlint';

import {FOR_CLOSE_RE, FOR_OPEN_RE} from './directives';
import {findPairedDirectiveIssues} from './helpers';

export const yfm023: Rule = {
    names: ['YFM023', 'for-block-invalid'],
    description: 'For block structure is invalid',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM023(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        findPairedDirectiveIssues(params, {open: FOR_OPEN_RE, close: FOR_CLOSE_RE}).forEach(
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
