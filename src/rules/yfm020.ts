import type {Rule} from 'markdownlint';

import {
    CUT_OPEN_RE,
    CUT_STRICT_RE,
    INCLUDE_STRICT_RE,
    NOTE_OPEN_RE,
    NOTE_STRICT_RE,
    TABS_OPEN_RE,
    TABS_STRICT_RE,
    isKnownDirective,
} from './directives';
import {findDirectiveMatches} from './helpers';

const INCLUDE_BROAD_RE = /^include(?:\s|$)/;

const SYNTAX_CHECKS = [
    {
        match: NOTE_OPEN_RE,
        valid: NOTE_STRICT_RE,
        message: `Invalid note syntax. Valid types: info, tip, warning, alert`,
    },
    {
        match: CUT_OPEN_RE,
        valid: CUT_STRICT_RE,
        message: `Invalid cut syntax. Expected: cut "title"`,
    },
    {
        match: TABS_OPEN_RE,
        valid: TABS_STRICT_RE,
        message: `Invalid tabs syntax. Valid variants: regular, radio, dropdown, accordion`,
    },
    {
        match: INCLUDE_BROAD_RE,
        valid: INCLUDE_STRICT_RE,
        message: `Invalid include syntax. Expected: include [text](path) or include notitle [text](path)`,
    },
];

function isCustomDirective(directive: string, customDirectives: string[]): boolean {
    return customDirectives.some((name) => {
        const openRe = new RegExp(`^${name}(?:\\s|$)`);
        const closeRe = new RegExp(`^end${name}$`);

        return openRe.test(directive) || closeRe.test(directive);
    });
}

export const yfm020: Rule = {
    names: ['YFM020', 'invalid-yfm-directive'],
    description: 'YFM directive is unknown or has invalid syntax',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM020(params, onError) {
        const {config} = params;

        if (!config) {
            return;
        }

        const customDirectives: string[] =
            (config as {customDirectives?: string[]}).customDirectives || [];

        findDirectiveMatches(params).forEach((match) => {
            // Check syntax of known directive families first
            for (const check of SYNTAX_CHECKS) {
                if (check.match.test(match.directive)) {
                    if (!check.valid.test(match.directive)) {
                        onError({
                            lineNumber: match.lineNumber,
                            detail: check.message,
                            context: match.line,
                        });
                    }
                    return;
                }
            }

            // Skip user-defined custom directives
            if (customDirectives.length && isCustomDirective(match.directive, customDirectives)) {
                return;
            }

            // Check for unknown directives
            if (!isKnownDirective(match.directive)) {
                onError({
                    lineNumber: match.lineNumber,
                    detail: `Unknown or invalid directive '{% ${match.directive} %}'`,
                    context: match.line,
                });
            }
        });
    },
};
