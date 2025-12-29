import type {Rule, RuleParams} from 'markdownlint';

import {findYfmLintTokens} from './helpers';

export const yfm008: Rule = {
    names: ['YFM008', 'term-inside-definition-not-allowed'],
    description: 'Term inside definition not allowed',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM008(params: RuleParams, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findYfmLintTokens(params, 'YFM008', onError);
    },
};
