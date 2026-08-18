import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

/**
 * YFM021 - Empty automatic heading anchor.
 *
 * Detects headings for which the anchors plugin could not generate a
 * non-empty automatic anchor. The plugin marks such heading tokens during
 * lint runs so this rule does not need to duplicate slug generation.
 */
export const yfm021: Rule = {
    names: ['YFM021', 'empty-auto-heading-anchor'],
    description: 'Automatic heading anchor is empty',
    tags: ['titles'],
    parser: 'markdownit',
    function: function YFM021(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        for (const token of params.parsers.markdownit.tokens) {
            if (token.type !== 'heading_open') {
                continue;
            }

            const heading = token as TokenWithAttrs;

            if (heading.attrGet('YFM021')) {
                onError({
                    lineNumber: heading.lineNumber,
                    detail:
                        'Automatic anchor cannot be generated from the heading text; ' +
                        'add an explicit anchor such as {#section-id}',
                    context: heading.line,
                });
            }
        }
    },
};
