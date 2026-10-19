import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {verifyBuild} = require('../scripts/verify-build.cjs');

describe('build output contract', () => {
    test('rejects a successful command that produced no exported files', () => {
        const root = mkdtempSync(join(tmpdir(), 'yfmlint-empty-build-'));
        try {
            expect(() => verifyBuild(root)).toThrow('Missing build output: build/index.js');
            mkdirSync(join(root, 'build'));
            writeFileSync(join(root, 'build/index.js'), 'module.exports = {};');
            expect(() => verifyBuild(root)).toThrow('Missing build output: build/index.d.ts');
            writeFileSync(join(root, 'build/index.d.ts'), '');
            expect(() => verifyBuild(root)).toThrow('Missing build output: build/index.d.ts');
            writeFileSync(join(root, 'build/index.d.ts'), 'export {};');
            expect(verifyBuild(root)).toEqual(['build/index.js', 'build/index.d.ts']);
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });
});
