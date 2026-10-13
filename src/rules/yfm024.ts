import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

/** Report ambiguous shorthand heading IDs marked by the transform anchors plugin. */
export const yfm024: Rule = {
    names: ['YFM024', 'malformed-custom-heading-anchor'],
    description: 'Custom heading anchor has ambiguous whitespace',
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
                        'Use {#section-id} without a space after # or bare words in the ID; ' +
                        'an empty ID falls back to an automatic anchor, while a multi-word ID uses its first word',
                    context: heading.line,
                });
            }
        }
    },
};
