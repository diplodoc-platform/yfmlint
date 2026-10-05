import type {Rule} from 'markdownlint';

import {findLinksInInlineTokens} from './helpers';

export const yfm024: Rule = {
    names: ['YFM024', 'missing-local-anchor'],
    description: 'Local link anchor is missing in the target document',
    tags: ['links'],
    parser: 'markdownit',
    function: function YFM024(params, onError) {
        findLinksInInlineTokens(params, 'YFM024', onError);
    },
};
