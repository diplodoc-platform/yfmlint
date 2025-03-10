import type {Rule, RuleParams} from 'markdownlint';

export const yfm008: Rule = {
    names: ['YFM008', 'term-inside-definition-not-allowed'],
    description: 'Term inside definition not allowed',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM008(params: RuleParams, onError) {
        const {config} = params;
        if (!config) {
            return;
        }
        params.parsers.markdownit.tokens
            .filter((token) => {
                return token.type === '__yfm_lint';
            })
            .forEach((term) => {
                // @ts-expect-error bad markdownlint typings
                if (term.attrGet('YFM008')) {
                    onError({
                        lineNumber: term.lineNumber,
                        context: term.line,
                    });
                }
            });
    },
};
