import type {Rule} from 'markdownlint';

import {
    findLinksInInlineTokens,
    resolveIncludeSource,
    validateLineNumberAndGetFilePath,
} from './helpers';

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

        findLinksInInlineTokens(params, 'YFM002', onError, (link, inline) => {
            const rawLineNumber = link.lineNumber || inline.lineNumber;
            const source =
                resolveIncludeSource(params, rawLineNumber, link, inline) ||
                validateLineNumberAndGetFilePath(params, rawLineNumber);

            onError({lineNumber: source.lineNumber, context: link.attrGet('href') || ''});
        });
    },
};
