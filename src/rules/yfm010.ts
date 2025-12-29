import type {Rule} from 'markdownlint';

import {findLinksInInlineTokens} from './helpers';

export const yfm010: Rule = {
    names: ['YFM010', 'unreachable-autotitle-anchor'],
    description: 'Auto title anchor is unreachable',
    tags: ['titles'],
    parser: 'markdownit',
    function: function YFM010(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findLinksInInlineTokens(params, 'YFM010', onError, (linkToken) => {
            // Plugins from @diplodoc/transform set YFM010 attribute on links
            // that reference autotitle anchors that don't exist
            const autotitleAnchorError = `[Unreachable autotitle anchor: "${linkToken.attrGet('href')}"]`;

            onError({
                lineNumber: linkToken.lineNumber,
                context: autotitleAnchorError + ' ' + (linkToken.line || ''),
            });
        });
    },
};
