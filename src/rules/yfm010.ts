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

        // Find all inline tokens containing links
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
                        // Plugins from @diplodoc/transform set YFM010 attribute on links
                        // that reference autotitle anchors that don't exist
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
