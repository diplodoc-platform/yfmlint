import type {Rule} from 'markdownlint';

import {findYfmLintTokens} from './helpers';

export const yfm004: Rule = {
    names: ['YFM004', 'table-not-closed'],
    description: 'Table not closed',
    tags: ['table'],
    parser: 'markdownit',
    function: function YFM004(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findYfmLintTokens(params, 'YFM004', onError);
    },
};
