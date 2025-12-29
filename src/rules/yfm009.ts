import type {Rule} from 'markdownlint';

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

        // The term plugin from @diplodoc/transform creates dfn_open/dfn_close tokens
        // for term definitions (e.g., [term]: definition)
        let lastCloseIndex = -1;
        const tokens = params.parsers.markdownit.tokens;
        const size = tokens.length;

        // Check for content between term definitions
        for (let i = 0; i < size; i++) {
            // Track the last dfn_close token
            if (tokens[i].type === 'dfn_close') {
                lastCloseIndex = i;
            }

            // Only process dfn_close tokens
            if (tokens[i].type !== 'dfn_close') {
                continue;
            }

            // If this is the last token, it's OK (terms at end)
            if (i === size - 1) {
                continue;
            }

            // Allow consecutive term definitions (dfn_close -> dfn_open)
            if (tokens[i + 1].type === 'dfn_open') {
                continue;
            }

            // Allow empty line between term definitions (dfn_close -> empty -> dfn_open)
            if (i < size - 2 && tokens[i + 2].type === 'dfn_open') {
                continue;
            }

            // Content found between term definitions - error
            onError({
                lineNumber: tokens[i + 1]?.lineNumber || tokens[i].lineNumber || 1,
                detail: 'There is a content between term definition. All term defitions should be placed at the end of file.',
            });
        }

        // Check that file ends with term definitions
        if (lastCloseIndex === -1) {
            return; // No term definitions found
        }

        // File must end with term definitions (lastCloseIndex should be last token)
        if (lastCloseIndex !== size - 1) {
            onError({
                lineNumber:
                    tokens[lastCloseIndex + 1]?.lineNumber ||
                    tokens[lastCloseIndex].lineNumber ||
                    1,
                detail: 'The file must end with term only.',
            });
        }
    },
};
