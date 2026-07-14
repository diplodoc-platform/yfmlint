import type {Rule} from 'markdownlint';

/**
 * Formats a character as its Unicode code point notation, e.g. "U+1F600".
 *
 * @param char - A single Unicode character (may be a surrogate pair)
 * @returns Code point in "U+XXXX" notation
 */
function toCodePoint(char: string): string {
    const codePoint = char.codePointAt(0) || 0;

    return 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * YFM021 - Non-BMP (UTF-16 surrogate pair) character.
 *
 * Detects characters outside the Unicode Basic Multilingual Plane
 * (code point > U+FFFF). In UTF-16 such characters are encoded as
 * surrogate pairs and are known to break layout in some browsers.
 *
 * The rule scans every line (iterating by code point, so surrogate pairs
 * are treated as a single character) and reports each occurrence so that
 * these characters do not reach production.
 */
export const yfm021: Rule = {
    names: ['YFM021', 'no-non-bmp-characters'],
    description: 'UTF-16 surrogate-pair character may break layout in some browsers',
    tags: ['encoding', 'utf16'],
    parser: 'markdownit',
    function: function YFM021(params, onError) {
        const {config} = params;
        if (!config) {
            return;
        }

        params.lines.forEach((line, index) => {
            let column = 0;

            // Iterating a string with for..of yields code points,
            // so a surrogate pair is handled as a single character.
            for (const char of line) {
                column += 1;

                const codePoint = char.codePointAt(0) || 0;

                if (codePoint > 0xffff) {
                    onError({
                        lineNumber: index + 1,
                        detail:
                            `Character ${toCodePoint(char)} '${char}' is outside the Basic ` +
                            `Multilingual Plane (UTF-16 surrogate pair) at column ${column} ` +
                            `and may break layout in some browsers`,
                        context: line,
                    });
                }
            }
        });
    },
};
