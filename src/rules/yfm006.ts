import type {Rule} from 'markdownlint';

import {findYfmLintTokens} from './helpers';

export const yfm006: Rule = {
    names: ['YFM006', 'term-definition-duplicated'],
    description: 'Term definition duplicated',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM006(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findYfmLintTokens(params, 'YFM006', onError);
    },
};
