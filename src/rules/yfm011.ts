import type {Rule} from 'markdownlint';

export const yfm011: Rule = {
    names: ['YFM011', 'max-svg-size'],
    description: 'Max svg size',
    tags: ['image_svg'],
    parser: 'markdownit',
    function: function YFM011(params, onError) {
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
                        return child.type === 'image';
                    })
                    .forEach((link) => {
                        // @ts-expect-error bad markdownlint typings
                        if (link.attrGet('YFM011')) {
                            // @ts-expect-error bad markdownlint typings
                            const svgSizeError = link.attrGet('YFM011');

                            onError({
                                lineNumber: link.lineNumber,
                                context: svgSizeError + ' ' + link.line,
                            });
                        }
                    });
            });
    },
};
