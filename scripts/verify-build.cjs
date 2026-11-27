const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function verifyBuild(root = path.resolve(__dirname, '..')) {
    const outputs = ['build/index.js', 'build/index.d.ts'];
    for (const output of outputs) {
        const file = path.join(root, output);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0)
            throw new Error(`Missing build output: ${output}`);
    }
    return outputs;
}

async function verifyRuntime() {
    const commonjs = require('@diplodoc/yfmlint');
    const esm = await import('@diplodoc/yfmlint');

    for (const {yfmlint} of [commonjs, esm]) {
        const errors = await yfmlint('<span>body</span>\n', 'smoke.md', {
            lintConfig: {MD033: true},
        });
        assert.deepEqual(
            errors?.map((error) => error.ruleNames[0]),
            ['MD033'],
        );
    }
}

if (require.main === module) {
    verifyBuild();
    verifyRuntime()
        .then(() => console.log('Verified exported JavaScript, declarations and runtime'))
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
}

module.exports = {verifyBuild};
