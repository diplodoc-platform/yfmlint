import type {Rule} from 'markdownlint';

import {getIgnoredLineNumbers} from './helpers';

const VISIBILITY_OPEN_RE = /^\s*:::visibility(?:\s+(.*?))?\s*$/;
const VALID_AUDIENCES = new Set(['human', 'agent']);

/**
 * YFM023 - Invalid visibility audience.
 *
 * Visibility is deliberately fail-closed during rendering. Linting the source as an error keeps a
 * typo from silently removing content in a published document.
 */
export const yfm023: Rule = {
    names: ['YFM023', 'invalid-visibility-audience'],
    description: 'Visibility audience is missing or invalid',
    tags: ['directives'],
    parser: 'markdownit',
    function: function YFM023(params, onError) {
        if (!params.config) {
            return;
        }

        const ignoredLines = getIgnoredLineNumbers(params);

        params.lines.forEach((line, index) => {
            const lineNumber = index + 1;
            if (ignoredLines.has(lineNumber)) {
                return;
            }

            const match = line.match(VISIBILITY_OPEN_RE);
            if (!match) {
                return;
            }

            const audience = match[1]?.trim() ?? '';
            if (!VALID_AUDIENCES.has(audience)) {
                onError({
                    lineNumber,
                    detail: 'Expected: :::visibility human or :::visibility agent',
                    context: line,
                });
            }
        });
    },
};
