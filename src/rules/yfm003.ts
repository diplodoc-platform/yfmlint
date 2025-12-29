import type {Rule} from 'markdownlint';

import {findLinksInInlineTokens} from './helpers';

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
            // Plugins from @diplodoc/transform set YFM003 attribute on links
            // that are unreachable (file not found, missing in TOC, etc.)
            // The attribute value contains the reason code
            const reason = linkToken.attrGet('YFM003');

            if (reason) {
                const reasonDescription =
                    typeof reason === 'string' && REASON_DESCRIPTION[reason]
                        ? `Reason: ${REASON_DESCRIPTION[reason]}`
                        : '';

                const context = [
                    `Unreachable link: "${linkToken.attrGet('href')}"`,
                    reasonDescription,
                    `Line: ${linkToken.lineNumber || inline.lineNumber}`,
                ]
                    .filter(Boolean)
                    .join('; ');
                onError({
                    lineNumber: linkToken.lineNumber || inline.lineNumber,
                    context,
                });
            }
        });
    },
};
