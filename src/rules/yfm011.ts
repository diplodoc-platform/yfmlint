import type {Rule} from 'markdownlint';

import {findImagesInInlineTokens} from './helpers';

export const yfm011: Rule = {
    names: ['YFM011', 'max-svg-size'],
    description: 'Max svg size',
    tags: ['image_svg'],
    parser: 'markdownit',
    function: function YFM011(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findImagesInInlineTokens(params, 'YFM011', onError, (imageToken) => {
            // Plugins from @diplodoc/transform set YFM011 attribute on images
            // that exceed maximum SVG size
            const svgSizeError = imageToken.attrGet('YFM011');

            onError({
                lineNumber: imageToken.lineNumber,
                context: (svgSizeError || '') + ' ' + (imageToken.line || ''),
            });
        });
    },
};
