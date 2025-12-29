import type {Rule} from 'markdownlint';

import {findLinksInInlineTokens} from './helpers';

export const yfm002: Rule = {
    names: ['YFM002', 'no-header-found-for-link'],
    description: 'No header found in the file for the link text',
    tags: ['links'],
    parser: 'markdownit',
    function: function YFM002(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findLinksInInlineTokens(params, 'YFM002', onError);
    },
};
