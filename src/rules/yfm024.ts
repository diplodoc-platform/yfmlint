import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

/** Report empty shorthand heading IDs marked by the transform anchors plugin. */
export const yfm024: Rule = {
    names: ['YFM024', 'empty-custom-heading-anchor'],
    description: 'Custom shorthand heading anchor is empty',
    tags: ['titles'],
    parser: 'markdownit',
    function: function YFM024(params, onError) {
        if (!params.config) {
            return;
        }
        for (const token of params.parsers.markdownit.tokens) {
            if (token.type !== 'heading_open') {
                continue;
            }
            const heading = token as TokenWithAttrs;
            if (heading.attrGet('YFM024')) {
                onError({
                    lineNumber: heading.lineNumber,
                    detail:
                        'Specify a nonempty ID, for example {#section-id}; ' +
                        'an empty ID falls back to an automatic anchor',
                    context: heading.line,
                });
            }
        }
    },
};
