/* eslint-env node */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    roots: ['<rootDir>/test'],
    preset: 'ts-jest',
    transform: {
        '^.+\\.ts?$': ['ts-jest', {useESM: true}],
    },
    modulePaths: ['<rootDir>'],
    moduleDirectories: ['node_modules'],
    testPathIgnorePatterns: ['spec.js', 'spec.ts'],
};
