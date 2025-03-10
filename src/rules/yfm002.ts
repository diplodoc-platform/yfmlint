import type {Rule} from 'markdownlint';

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
                        if (link.attrGet('YFM002')) {
                            onError({
                                lineNumber: link.lineNumber,
                                context: link.line,
                            });
                        }
                    });
            });
    },
};
