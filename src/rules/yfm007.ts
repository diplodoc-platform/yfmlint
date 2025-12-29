import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

export const yfm007: Rule = {
    names: ['YFM007', 'term-used-without-definition'],
    description: 'Term used without definition',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM007(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        // The term plugin from @diplodoc/transform creates __yfm_lint tokens
        // for terms that are used without definition
        // It sets YFM007 attribute on these tokens when isLintRun = true
        // Note: YFM007 tokens are nested in inline tokens, so we need to check children
        params.parsers.markdownit.tokens.forEach((el) =>
            el.children
                ?.filter((token) => token.type === '__yfm_lint')
                .forEach((term) => {
                    const termToken = term as unknown as TokenWithAttrs;
                    if (termToken.attrGet('YFM007')) {
                        onError({
                            lineNumber: term.lineNumber,
                            context: term.line,
                        });
                    }
                }),
        );
    },
};
