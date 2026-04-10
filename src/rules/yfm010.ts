import type {MarkdownItToken, Rule} from 'markdownlint';

import {
    findLinksInInlineTokens,
    formatIncludeChain,
    resolveIncludeSource,
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
            const href = linkToken.attrGet('href') || '';
            const rawLineNumber = linkToken.lineNumber || inline.lineNumber;
            const includeSource = resolveIncludeSource(
                params,
                rawLineNumber,
                linkToken as MarkdownItToken,
                inline,
            );

            if (includeSource) {
                const context = formatIncludeChain(includeSource, href);
                onError({lineNumber: includeSource.lineNumber, context});
            } else {
                const {lineNumber} = validateLineNumberAndGetFilePath(params, rawLineNumber);
                const context = `Unreachable autotitle anchor: "${href}"; Line: ${rawLineNumber}`;
                onError({lineNumber, context});
            }
        });
    },
};
