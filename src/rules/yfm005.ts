import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

export const yfm005: Rule = {
    names: ['YFM005', 'tab-list-not-closed'],
    description: 'Tab list not closed',
    tags: ['tab'],
    parser: 'markdownit',
    function: function YFM005(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        // YFM005 uses paragraph_open tokens, not __yfm_lint tokens
        // This is different from other rules, so we can't use findYfmLintTokens helper
        params.parsers.markdownit.tokens
            .filter((token) => token.type === 'paragraph_open')
            .forEach((token) => {
                const tokenWithAttrs = token as unknown as TokenWithAttrs;
                if (tokenWithAttrs.attrGet('YFM005')) {
                    onError({
                        lineNumber: token.lineNumber,
                        context: token.line,
                    });
                }
            });
    },
};
