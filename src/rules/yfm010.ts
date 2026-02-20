import type {Rule} from 'markdownlint';

import {
    createContextWithFileInfo,
    findLinksInInlineTokens,
    validateLineNumberAndGetFilePath,
} from './helpers';

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

        findLinksInInlineTokens(params, 'YFM010', onError, (linkToken, inline) => {
            // Plugins from @diplodoc/transform set YFM010 attribute on links
            // that reference autotitle anchors that don't exist
            const autotitleAnchorError = `[Unreachable autotitle anchor: "${linkToken.attrGet('href')}"]`;

            // Get the original line number from token
            const rawLineNumber = linkToken.lineNumber || inline.lineNumber;
            const {lineNumber, filePath} = validateLineNumberAndGetFilePath(params, rawLineNumber);

            const baseContext = [autotitleAnchorError, linkToken.line || ''].join(' ');

            const context = createContextWithFileInfo(baseContext, filePath, params.name);

            onError({
                lineNumber,
                context,
            });
        });
    },
};
