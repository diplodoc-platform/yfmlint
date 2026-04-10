import type {Rule} from 'markdownlint';

import {isKnownDirective} from './directives';
import {findDirectiveMatches} from './helpers';

export const yfm021: Rule = {
    names: ['YFM021', 'invalid-yfm-directive'],
    description: 'YFM directive is unknown or has invalid syntax',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM021(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        findDirectiveMatches(params).forEach((match) => {
            if (isKnownDirective(match.directive)) {
                return;
            }

            onError({
                lineNumber: match.lineNumber,
                detail: `Unknown or invalid directive '{% ${match.directive} %}'`,
                context: match.line,
            });
        });
    },
};
