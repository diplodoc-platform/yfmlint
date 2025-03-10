import type {MarkdownItToken, Rule, RuleOnError, RuleParams} from 'markdownlint/lib/markdownlint';

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

function forEachInlineCodeSpan(input: string, handler: Function) {
    const backtickRe = /`+/g;
    let match = null;
    const backticksLengthAndIndex = [];
    while ((match = backtickRe.exec(input)) !== null) {
        backticksLengthAndIndex.push([match[0].length, match.index]);
    }
    const newLinesIndex = [];
    while ((match = newLineRe.exec(input)) !== null) {
        newLinesIndex.push(match.index);
    }
    let lineIndex = 0;
    let lineStartIndex = 0;
    let k = 0;
    for (let i = 0; i < backticksLengthAndIndex.length - 1; i++) {
        const [startLength, startIndex] = backticksLengthAndIndex[i];
        if (!(startIndex === 0 || input[startIndex - 1] !== '\\')) {
            continue;
        }

        for (let j = i + 1; j < backticksLengthAndIndex.length; j++) {
            const [endLength, endIndex] = backticksLengthAndIndex[j];
            if (startLength !== endLength) {
                continue;
            }

            for (; k < newLinesIndex.length; k++) {
                const newLineIndex = newLinesIndex[k];
                if (startIndex < newLineIndex) {
                    break;
                }
                lineIndex++;
                lineStartIndex = newLineIndex + 1;
            }

            const columnIndex = startIndex - lineStartIndex + startLength;
            handler(
                input.slice(startIndex + startLength, endIndex),
                lineIndex,
                columnIndex,
                startLength,
            );

            i = j;
            break;
        }
    }
}

export const yfm001: Rule = {
    names: ['YFM001', 'inline-code-length'],
    description: 'Inline code length',
    tags: ['line_length'],
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
