import type {Rule} from 'markdownlint';

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
                        return child.type === 'link_open';
                    })
                    .forEach((link) => {
                        // @ts-expect-error bad markdownlint typings
                        if (link.attrGet('YFM003')) {
                            // @ts-expect-error bad markdownlint typings
                            const linkHrefError = `[Unreachable link: "${link.attrGet('href')}"]`;

                            onError({
                                lineNumber: link.lineNumber,
                                context: linkHrefError + link.line,
                            });
                        }
                    });
            });
    },
};
