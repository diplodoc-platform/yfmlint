import type {MarkdownItToken, Rule} from 'markdownlint';

import {
    findLinksInInlineTokens,
    formatIncludeChain,
    resolveIncludeSource,
    validateLineNumberAndGetFilePath,
} from './helpers';

const REASON_DESCRIPTION: Record<string, string> = {
    'file-not-found': 'File does not exist in the project',
    'missing-in-toc': 'File is not declared in toc',
    'missing-in-toc-and-file-not-found': 'File does not exist and is not declared in toc',
};

export const yfm003: Rule = {
    names: ['YFM003', 'unreachable-link'],
    description: 'Link is unreachable',
    tags: ['links'],
    parser: 'markdownit',
    function: function YFM003(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        findLinksInInlineTokens(params, 'YFM003', onError, (linkToken, inline) => {
            const reason = linkToken.attrGet('YFM003');

            if (reason) {
                const reasonDescription =
                    typeof reason === 'string' && REASON_DESCRIPTION[reason]
                        ? `Reason: ${REASON_DESCRIPTION[reason]}`
                        : '';

                const rawLineNumber = linkToken.lineNumber || inline.lineNumber;
                const href = linkToken.attrGet('href') || '';
                const includeSource = resolveIncludeSource(
                    params,
                    rawLineNumber,
                    linkToken as MarkdownItToken,
                    inline,
                );

                if (includeSource) {
                    const chain = formatIncludeChain(includeSource, href);
                    const context = [chain, reasonDescription].filter(Boolean).join('; ');
                    onError({lineNumber: includeSource.lineNumber, context});
                } else {
                    const {lineNumber} = validateLineNumberAndGetFilePath(params, rawLineNumber);
                    const context = [
                        `Unreachable link: "${href}"`,
                        reasonDescription,
                        `Line: ${rawLineNumber}`,
                    ]
                        .filter(Boolean)
                        .join('; ');
                    onError({lineNumber, context});
                }
            }
        });
    },
};
