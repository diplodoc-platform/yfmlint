import {defineConfig} from 'vite';

export default defineConfig({
    test: {
        include: ['test/*.test.ts'],
        exclude: ['node_modules'],
        coverage: {
            all: true,
            provider: 'v8',
            include: ['src/**'],
            excludeAfterRemap: true,
            reporter: ['text', 'json', 'html', 'lcov'],
        },
    },
});
