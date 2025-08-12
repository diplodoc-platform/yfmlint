#!/usr/bin/env node

import {build} from 'esbuild';

import tsconfigJson from '../tsconfig.json' with {type: 'json'};

const outDir = 'build';

/** @type {import('esbuild').BuildOptions}*/
const common = {
    bundle: true,
    sourcemap: true,
    target: tsconfigJson.compilerOptions.target,
    tsconfig: './tsconfig.json',
};

build({
    ...common,
    entryPoints: ['src/index.ts'],
    outfile: outDir + '/index.js',
    platform: 'node',
});
