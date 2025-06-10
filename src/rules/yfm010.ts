import type {Rule} from 'markdownlint';

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
                        if (link.attrGet('YFM010')) {
                            // @ts-expect-error bad markdownlint typings
                            const autotitleAnchorError = `[Unreachable autotitle anchor: "${link.attrGet('href')}"]`;

                            onError({
                                lineNumber: link.lineNumber,
                                context: autotitleAnchorError + link.line,
                            });
                        }
                    });
            });
    },
};
