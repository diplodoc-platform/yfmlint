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

if (require.main === module) {
    verifyBuild();
    console.log('Verified exported JavaScript and declaration outputs');
}

module.exports = {verifyBuild};
