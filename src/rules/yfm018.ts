import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

export const yfm018: Rule = {
    names: ['YFM018', 'term-definition-from-include'],
    description: 'Term definition comes from an included file',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM018(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        const tokens = params.parsers.markdownit.tokens as TokenWithAttrs[];
        const size = tokens.length;

        for (let i = 0; i < size; i++) {
            if (tokens[i].type !== 'dfn_open') {
                continue;
            }

            if (tokens[i].attrGet('from-include') !== 'true') {
                continue;
            }

            onError({
                lineNumber: tokens[i].lineNumber || 1,
                detail: 'Term definition is provided via include. Consider moving it to the end of the page or defining the term locally.',
            });
        }
    },
};
