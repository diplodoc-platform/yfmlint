import type {MarkdownItToken, Rule, RuleOnError, RuleParams} from 'markdownlint';

function addErrorDetailIf(
    onError: RuleOnError,
    lineNumber: number,
    expected: number,
    actual: number,
    detail: string | null,
    context: string,
) {
    onError({
        lineNumber,
        detail: 'Expected: ' + expected + '; Actual: ' + actual + (detail ? '; ' + detail : ''),
        context,
    });
}

function filterTokens(params: RuleParams, type: string, handler: Function) {
    // @ts-ignore
    for (const token of params.parsers.markdownit.tokens) {
        if (token.type === type) {
            handler(token);
        }
    }
}

const newLineRe = /\r\n?|\n/g;

/**
 * Finds all inline code spans in markdown text and calls handler for each.
 *
 * Algorithm:
 * 1. Find all backtick sequences (`` ` ``, ``` ```, etc.) and their positions
 * 2. Find all newline positions for line/column calculation
 * 3. Match opening/closing backticks:
 *    - Opening backtick must not be escaped (not preceded by \)
 *    - Opening and closing backticks must have same length
 * 4. Calculate line and column numbers accounting for newlines
 * 5. Extract code content (between backticks) and call handler
 *
 * @param {string} input - Markdown text to parse
 * @param {Function} handler - Function called for each code span: (code, line, column, backtickLength)
 * @returns {void}
 */
function forEachInlineCodeSpan(input: string, handler: Function) {
    const backtickRe = /`+/g;
    let match = null;
    // Find all backtick sequences: [length, index]
    const backticksLengthAndIndex = [];
    while ((match = backtickRe.exec(input)) !== null) {
        backticksLengthAndIndex.push([match[0].length, match.index]);
    }
    // Find all newline positions for line/column calculation
    const newLinesIndex = [];
    while ((match = newLineRe.exec(input)) !== null) {
        newLinesIndex.push(match.index);
    }
    let lineIndex = 0;
    let lineStartIndex = 0;
    let k = 0; // Index in newLinesIndex array
    // Match opening and closing backticks
    for (let i = 0; i < backticksLengthAndIndex.length - 1; i++) {
        const [startLength, startIndex] = backticksLengthAndIndex[i];
        // Skip escaped backticks (preceded by backslash)
        if (!(startIndex === 0 || input[startIndex - 1] !== '\\')) {
            continue;
        }

        // Find matching closing backticks
        for (let j = i + 1; j < backticksLengthAndIndex.length; j++) {
            const [endLength, endIndex] = backticksLengthAndIndex[j];
            // Opening and closing must have same number of backticks
            if (startLength !== endLength) {
                continue;
            }

            // Calculate line number: count newlines before startIndex
            for (; k < newLinesIndex.length; k++) {
                const newLineIndex = newLinesIndex[k];
                if (startIndex < newLineIndex) {
                    break;
                }
                lineIndex++;
                lineStartIndex = newLineIndex + 1;
            }

            // Calculate column: position from start of line + backtick length
            const columnIndex = startIndex - lineStartIndex + startLength;
            // Extract code content (between backticks) and call handler
            handler(
                input.slice(startIndex + startLength, endIndex),
                lineIndex,
                columnIndex,
                startLength,
            );

            i = j; // Skip to after closing backticks
            break;
        }
    }
}

export const yfm001: Rule = {
    names: ['YFM001', 'inline-code-length'],
    description: 'Inline code length',
    tags: ['line_length'],
    parser: 'markdownit',
    function: function YFM001(params, onError) {
        const {config} = params;
        const maxLength = Number(config.maximum || 100);

        filterTokens(params, 'inline', (token: MarkdownItToken) => {
            if (!token.children?.some((child) => child.type === 'code_inline') || !token.map) {
                return;
            }

            const tokenLines = params.lines.slice(token.map[0], token.map[1]);
            forEachInlineCodeSpan(tokenLines.join('\n'), (code: string, currentLine: number) => {
                if (code.length <= maxLength) {
                    return;
                }

                addErrorDetailIf(
                    onError,
                    token.lineNumber + currentLine,
                    maxLength,
                    code.length,
                    null,
                    code,
                );
            });
        });
    },
};
