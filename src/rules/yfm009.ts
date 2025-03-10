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

        let lastCloseIndex = -1;
        const tokens = params.parsers.markdownit.tokens;
        const size = tokens.length;

        for (let i = 0; i < size; i++) {
            if (tokens[i].type === 'template_close') {
                lastCloseIndex = i;
            }

            if (tokens[i].type !== 'template_close') {
                continue;
            }

            if (i === size - 1) {
                continue;
            }

            if (tokens[i + 1].type === 'template_open') {
                continue;
            }

            if (i < size - 2 && tokens[i + 2].type === 'template_open') {
                continue;
            }

            onError({
                lineNumber: tokens[i + 1].lineNumber,
                detail: 'There is a content between term definition. All term defitions should be placed at the end of file.',
            });
        }

        if (lastCloseIndex === -1) {
            return;
        }

        if (lastCloseIndex !== size - 1) {
            onError({
                lineNumber: tokens[lastCloseIndex + 1].lineNumber,
                detail: 'The file must end with term only.',
            });
        }
    },
};
