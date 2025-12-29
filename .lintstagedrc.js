/* eslint-env node */
module.exports = {
    // Exclude config files and scripts from linting (they use CommonJS)
    '**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}': (filenames) => {
        // Filter out config files and scripts
        const configFiles = [
            '.lintstagedrc.js',
            '.eslintrc.js',
            '.prettierrc.js',
            '.stylelintrc.js',
            'prettier-common-config.js',
        ];
        const filtered = filenames.filter(
            (f) =>
                !configFiles.some((config) => f.includes(config)) &&
                !f.includes('scripts/') &&
                !f.includes('test/'),
        );
        if (filtered.length === 0) {
            return [];
        }
        return [
            ...filtered.map((f) => `prettier --write ${f}`),
            ...filtered.map((f) => `eslint --max-warnings=0 --fix ${f}`),
        ];
    },
    // Handle .lintstagedrc.js separately (only prettier, no eslint)
    '.lintstagedrc.js': (filenames) => filenames.map((f) => `prettier --write ${f}`),
    '**/*.{css,scss}': (filenames) => [
        ...filenames.map((f) => `prettier --write ${f}`),
        ...filenames.map((f) => `stylelint --fix ${f}`),
    ],
    '**/*.{json,yaml,yml,md}': (filenames) => filenames.map((f) => `prettier --write ${f}`),
    '**/*.{svg,svgx}': ['svgo'],
    // Run unit tests when test files or source files change
    '**/*.{ts,tsx}': (filenames) => {
        const testFiles = filenames.filter((f) => f.includes('.test.') || f.includes('.spec.'));
        const sourceFiles = filenames.filter(
            (f) => !f.includes('.test.') && !f.includes('.spec.') && f.includes('src/'),
        );
        const commands = [];
        // Run tests if test files or source files changed
        if (testFiles.length > 0 || sourceFiles.length > 0) {
            commands.push('npm test');
        }
        return commands;
    },
};
