module.exports = {
    root: true,
    extends: require.resolve('@diplodoc/lint/eslint-config'),
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: true,
    },
    overrides: [
        {
            files: ['*.mjs', '*.cjs'],
            parserOptions: {
                project: null,
            },
        },
    ],
};
