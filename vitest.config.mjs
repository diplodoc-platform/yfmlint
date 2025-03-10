import {defineConfig} from 'vite';

export default defineConfig({
    test: {
        include: ['test/*.test.ts'],
        exclude: ['node_modules'],
        coverage: {
            enabled: true,
            provider: 'v8',
            include: ['src'],
        },
    },
});
