import type {Rule} from 'markdownlint';
import type {TokenWithAttrs} from '../typings';

function isFromInclude(token: TokenWithAttrs): boolean {
    return token.attrGet('from-include') === 'true';
}

function isLintMarker(token: TokenWithAttrs): boolean {
    return token.type === '__yfm_lint';
}

function findMatchingDfnOpen(tokens: TokenWithAttrs[], closeIndex: number): number {
    let depth = 0;
    for (let j = closeIndex; j >= 0; j--) {
        if (tokens[j].type === 'dfn_close') depth++;
        if (tokens[j].type === 'dfn_open') {
            depth--;
            if (depth === 0) return j;
        }
    }
    return -1;
}

/**
 * Advances past tokens that are not real content: `__yfm_lint` markers
 * and from-include dfn pairs.
 *
 * @param tokens - Array of tokens to process
 * @param from - Starting position in the tokens array
 * @returns Position of the first real content token after skipping non-content tokens
 */
function skipNonContent(tokens: TokenWithAttrs[], from: number): number {
    let pos = from;
    while (pos < tokens.length) {
        if (isLintMarker(tokens[pos])) {
            pos++;
            continue;
        }
        if (tokens[pos].type === 'dfn_open' && isFromInclude(tokens[pos])) {
            pos = skipDfnPair(tokens, pos);
            continue;
        }
        break;
    }
    return pos;
}

/**
 * Skips a complete dfn pair (open and close) starting from the given position.
 *
 * @param tokens - Array of tokens to process
 * @param from - Starting position (should point to a dfn_open token)
 * @returns Position after the matching dfn_close token
 */
function skipDfnPair(tokens: TokenWithAttrs[], from: number): number {
    let depth = 1;
    let pos = from + 1;
    while (pos < tokens.length && depth > 0) {
        if (tokens[pos].type === 'dfn_open') depth++;
        if (tokens[pos].type === 'dfn_close') depth--;
        pos++;
    }
    return pos;
}

function isLocalDfnClose(tokens: TokenWithAttrs[], index: number): boolean {
    if (tokens[index].type !== 'dfn_close') return false;
    const openIndex = findMatchingDfnOpen(tokens, index);
    return openIndex < 0 || !isFromInclude(tokens[openIndex]);
}

function hasLocalDfnOpenAt(tokens: TokenWithAttrs[], index: number): boolean {
    return (
        index < tokens.length && tokens[index].type === 'dfn_open' && !isFromInclude(tokens[index])
    );
}

export const yfm009: Rule = {
    names: ['YFM009', 'no-term-definition-in-content'],
    description: 'Term definition should be placed at the end of file',
    tags: ['term'],
    parser: 'markdownit',
    function: function YFM009(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        const tokens = params.parsers.markdownit.tokens as TokenWithAttrs[];
        const size = tokens.length;
        let lastLocalCloseIndex = -1;

        for (let i = 0; i < size; i++) {
            if (!isLocalDfnClose(tokens, i)) {
                continue;
            }

            lastLocalCloseIndex = i;

            if (i === size - 1) {
                continue;
            }

            const nextReal = skipNonContent(tokens, i + 1);
            if (nextReal >= size || hasLocalDfnOpenAt(tokens, nextReal)) {
                continue;
            }

            onError({
                lineNumber: tokens[i + 1]?.lineNumber || tokens[i].lineNumber || 1,
                detail: 'There is a content between term definition. All term defitions should be placed at the end of file.',
            });
        }

        if (lastLocalCloseIndex === -1) {
            return;
        }

        const tailPos = skipNonContent(tokens, lastLocalCloseIndex + 1);
        if (tailPos < size) {
            onError({
                lineNumber:
                    tokens[lastLocalCloseIndex + 1]?.lineNumber ||
                    tokens[lastLocalCloseIndex].lineNumber ||
                    1,
                detail: 'The file must end with term only.',
            });
        }
    },
};
