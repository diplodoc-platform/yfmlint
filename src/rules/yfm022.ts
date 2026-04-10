import type {Rule} from 'markdownlint';

import {IF_CLOSE_RE, IF_OPEN_RE} from './directives';
import {findPairedDirectiveIssues} from './helpers';

export const yfm022: Rule = {
    names: ['YFM022', 'if-block-invalid'],
    description: 'If block structure is invalid',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM022(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        findPairedDirectiveIssues(params, {open: IF_OPEN_RE, close: IF_CLOSE_RE}).forEach(
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
