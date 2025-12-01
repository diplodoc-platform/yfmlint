import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from 'src/typings';

const REASON_DESCRIPTION: Record<string, string> = {
    'file-not-found': 'File does not exist in the project',
    'missing-in-toc': 'File exists but is not declared in toc',
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

        params.parsers.markdownit.tokens
            .filter((token) => {
                return token.type === 'inline';
            })
            .forEach((inline) => {
                inline.children
                    ?.filter((child) => {
                        return child && child.type === 'link_open';
                    })
                    .forEach((link) => {
                        const linkToken = link as unknown as TokenWithAttrs;
                        const reason = linkToken.attrGet('YFM003');

                        if (reason) {
                            const reasonDescription =
                                typeof reason === 'string' && REASON_DESCRIPTION[reason]
                                    ? `Reason: ${REASON_DESCRIPTION[reason]}`
                                    : '';

                            const context = [
                                `Unreachable link: "${linkToken.attrGet('href')}"`,
                                reasonDescription,
                                `Line: ${link.line || inline.line}`,
                            ]
                                .filter(Boolean)
                                .join('; ');
                            onError({
                                lineNumber: link.lineNumber || inline.lineNumber,
                                context,
                            });
                        }
                    });
            });
    },
};
