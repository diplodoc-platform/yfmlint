import type {IncludeSourceInfo} from '../src/rules/helpers';
import type {MarkdownItToken, RuleParams} from 'markdownlint';

import {describe, expect, it, vi} from 'vitest';

import {
    createContextWithFileInfo,
    findImagesInInlineTokens,
    findLinksInInlineTokens,
    findYfmLintTokens,
    formatIncludeChain,
    resolveIncludeSource,
    validateLineNumberAndGetFilePath,
} from '../src/rules/helpers';

interface TokenMeta {
    sourceFile?: string;
    includeChain?: Array<{file: string; line: number}>;
}

type TokenWithMeta = MarkdownItToken & {meta?: TokenMeta | null};

type TokenWithAttrs = MarkdownItToken & {attrGet: (name: string) => string | null};

function makeParams(opts: {
    lines?: string[];
    name?: string;
    env?: Record<string, unknown>;
    tokens?: MarkdownItToken[];
}): RuleParams {
    const lines = opts.lines || ['line1', 'line2', 'line3'];
    return {
        lines,
        name: opts.name || 'test.md',
        parsers: {
            markdownit: {
                tokens: opts.tokens || [],
                env: opts.env || {},
            },
        },
    } as unknown as RuleParams;
}

function makeToken(meta?: Record<string, unknown> | null, lineNumber?: number) {
    return {
        meta: meta || null,
        lineNumber: lineNumber || undefined,
    } as TokenWithMeta;
}

function makeLinkToken(
    attrs: Record<string, string | null>,
    opts?: {lineNumber?: number; meta?: Record<string, unknown>},
): TokenWithAttrs {
    const attrsMap = new Map(Object.entries(attrs));
    return {
        type: 'link_open',
        attrGet: (name: string) => attrsMap.get(name) ?? null,
        lineNumber: opts?.lineNumber,
        meta: opts?.meta || null,
        line: '',
    } as TokenWithAttrs;
}

function makeImageToken(
    attrs: Record<string, string | null>,
    opts?: {lineNumber?: number; meta?: Record<string, unknown>},
): TokenWithAttrs {
    const attrsMap = new Map(Object.entries(attrs));
    return {
        type: 'image',
        attrGet: (name: string) => attrsMap.get(name) ?? null,
        lineNumber: opts?.lineNumber,
        meta: opts?.meta || null,
        line: '',
    } as TokenWithAttrs;
}

function makeInlineToken(
    children: MarkdownItToken[],
    opts?: {lineNumber?: number; line?: string; meta?: Record<string, unknown>},
): MarkdownItToken {
    return {
        type: 'inline',
        children,
        lineNumber: opts?.lineNumber || 1,
        line: opts?.line || 'inline content',
        meta: opts?.meta || null,
    } as MarkdownItToken;
}

describe('validateLineNumberAndGetFilePath', () => {
    it('clamps lineNumber to valid range', () => {
        const params = makeParams({lines: ['a', 'b', 'c']});

        expect(validateLineNumberAndGetFilePath(params, 100).lineNumber).toBe(3);
        expect(validateLineNumberAndGetFilePath(params, 0).lineNumber).toBe(1);
        expect(validateLineNumberAndGetFilePath(params, -5).lineNumber).toBe(1);
        expect(validateLineNumberAndGetFilePath(params, undefined).lineNumber).toBe(1);
    });

    it('returns valid lineNumber as-is', () => {
        const params = makeParams({lines: ['a', 'b', 'c']});
        expect(validateLineNumberAndGetFilePath(params, 2).lineNumber).toBe(2);
    });

    it('returns filePath from env.path', () => {
        const params = makeParams({env: {path: 'custom/path.md'}});
        expect(validateLineNumberAndGetFilePath(params, 1).filePath).toBe('custom/path.md');
    });

    it('falls back to params.name when env.path is absent', () => {
        const params = makeParams({name: 'fallback.md', env: {}});
        expect(validateLineNumberAndGetFilePath(params, 1).filePath).toBe('fallback.md');
    });
});

describe('resolveIncludeSource', () => {
    it('returns null when token has no meta', () => {
        const params = makeParams({});
        const token = makeToken(null);
        expect(resolveIncludeSource(params, 5, token)).toBeNull();
    });

    it('returns null when meta has no sourceFile', () => {
        const params = makeParams({});
        const token = makeToken({includeChain: [{file: 'a.md', line: 1}]});
        expect(resolveIncludeSource(params, 5, token)).toBeNull();
    });

    it('returns null when includeChain is empty', () => {
        const params = makeParams({});
        const token = makeToken({sourceFile: 'inc.md', includeChain: []});
        expect(resolveIncludeSource(params, 5, token)).toBeNull();
    });

    it('extracts source info from token meta', () => {
        const params = makeParams({lines: ['a', 'b', 'c', 'd', 'e']});
        const chain = [{file: 'main.md', line: 3}];
        const token = makeToken({sourceFile: '_includes/chapter.md', includeChain: chain}, 1);

        const result = resolveIncludeSource(params, 1, token);

        expect(result).toEqual({
            lineNumber: 3,
            sourceFile: '_includes/chapter.md',
            sourceLineNumber: 1,
            includeChain: chain,
        });
    });

    it('falls back to parentToken meta when token has none', () => {
        const params = makeParams({lines: ['a', 'b', 'c']});
        const chain = [{file: 'main.md', line: 2}];
        const token = makeToken(null);
        const parent = makeToken({sourceFile: '_includes/file.md', includeChain: chain});

        const result = resolveIncludeSource(params, 5, token, parent);

        expect(result).not.toBeNull();
        expect(result!.sourceFile).toBe('_includes/file.md');
    });

    it('clamps lineNumber from chain to valid range', () => {
        const params = makeParams({lines: ['a', 'b']});
        const chain = [{file: 'main.md', line: 999}];
        const token = makeToken({sourceFile: 'inc.md', includeChain: chain});

        const result = resolveIncludeSource(params, 1, token);

        expect(result!.lineNumber).toBe(2);
    });

    it('defaults sourceLineNumber to 1 when rawLineNumber is undefined', () => {
        const params = makeParams({lines: ['a', 'b', 'c']});
        const chain = [{file: 'main.md', line: 1}];
        const token = makeToken({sourceFile: 'inc.md', includeChain: chain});

        const result = resolveIncludeSource(params, undefined, token);

        expect(result!.sourceLineNumber).toBe(1);
    });
});

describe('formatIncludeChain', () => {
    it('formats single-level chain', () => {
        const info: IncludeSourceInfo = {
            lineNumber: 3,
            sourceFile: '_includes/chapter.md',
            sourceLineNumber: 1,
            includeChain: [{file: 'index.md', line: 3}],
        };

        expect(formatIncludeChain(info, 'broken.html')).toBe(
            'index.md:3 → _includes/chapter.md:1 ↛ broken.html',
        );
    });

    it('formats multi-level chain', () => {
        const info: IncludeSourceInfo = {
            lineNumber: 3,
            sourceFile: '_includes/details.md',
            sourceLineNumber: 10,
            includeChain: [
                {file: 'main.md', line: 3},
                {file: '_includes/chapter.md', line: 5},
            ],
        };

        expect(formatIncludeChain(info, 'broken-page.html')).toBe(
            'main.md:3 → _includes/chapter.md:5 → _includes/details.md:10 ↛ broken-page.html',
        );
    });

    it('handles empty broken target', () => {
        const info: IncludeSourceInfo = {
            lineNumber: 1,
            sourceFile: 'file.md',
            sourceLineNumber: 1,
            includeChain: [{file: 'main.md', line: 1}],
        };

        expect(formatIncludeChain(info, '')).toBe('main.md:1 → file.md:1 ↛ ');
    });
});

describe('createContextWithFileInfo', () => {
    it('returns base context when filePath matches paramsName', () => {
        expect(createContextWithFileInfo('some error', 'test.md', 'test.md')).toBe('some error');
    });

    it('appends File: when filePath differs from paramsName', () => {
        expect(createContextWithFileInfo('some error', 'other.md', 'test.md')).toBe(
            'some error; File: other.md',
        );
    });
});

describe('findLinksInInlineTokens', () => {
    it('calls custom handler for matching link tokens', () => {
        const link = makeLinkToken({YFM003: 'missing-in-toc', href: 'broken.html'});
        const inline = makeInlineToken([link], {lineNumber: 1});
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();
        const handler = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError, handler);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(link, inline);
        expect(onError).not.toHaveBeenCalled();
    });

    it('skips link tokens without matching rule attribute', () => {
        const link = makeLinkToken({href: 'page.html'});
        const inline = makeInlineToken([link], {lineNumber: 1});
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).not.toHaveBeenCalled();
    });

    it('default handler reports error without include source', () => {
        const link = makeLinkToken(
            {YFM003: 'missing-in-toc', href: 'broken.html'},
            {lineNumber: 2},
        );
        const inline = makeInlineToken([link], {lineNumber: 2, line: '[broken](broken.html)'});
        const params = makeParams({tokens: [inline], name: 'test.md'});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).toHaveBeenCalledOnce();
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({lineNumber: 2}));
    });

    it('default handler reports error with include chain context', () => {
        const chain = [{file: 'main.md', line: 5}];
        const link = makeLinkToken(
            {YFM003: 'missing-in-toc', href: 'broken.html'},
            {lineNumber: 1, meta: {sourceFile: '_includes/inc.md', includeChain: chain}},
        );
        const inline = makeInlineToken([link], {lineNumber: 5});
        const params = makeParams({tokens: [inline], lines: ['a', 'b', 'c', 'd', 'e']});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).toHaveBeenCalledOnce();
        const call = onError.mock.calls[0][0];
        expect(call.lineNumber).toBe(5);
        expect(call.context).toContain('main.md:5');
        expect(call.context).toContain('_includes/inc.md:1');
        expect(call.context).toContain('↛');
        expect(call.context).toContain('broken.html');
    });

    it('uses inline lineNumber when link has no lineNumber', () => {
        const link = makeLinkToken({YFM003: 'missing-in-toc', href: 'x.html'});
        const inline = makeInlineToken([link], {lineNumber: 3, line: '[x](x.html)'});
        const params = makeParams({tokens: [inline], name: 'test.md'});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0].lineNumber).toBe(3);
    });

    it('skips non-inline tokens', () => {
        const token = {type: 'paragraph_open', children: null} as unknown as MarkdownItToken;
        const params = makeParams({tokens: [token]});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).not.toHaveBeenCalled();
    });

    it('handles inline token with null children', () => {
        const inline = {
            type: 'inline',
            children: null,
            lineNumber: 1,
        } as unknown as MarkdownItToken;
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();

        findLinksInInlineTokens(params, 'YFM003', onError);

        expect(onError).not.toHaveBeenCalled();
    });
});

describe('findImagesInInlineTokens', () => {
    it('calls custom handler for matching image tokens', () => {
        const image = makeImageToken({YFM011: 'oversized', src: 'big.png'});
        const inline = makeInlineToken([image], {lineNumber: 1});
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();
        const handler = vi.fn();

        findImagesInInlineTokens(params, 'YFM011', onError, handler);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(image, inline);
        expect(onError).not.toHaveBeenCalled();
    });

    it('skips image tokens without matching rule attribute', () => {
        const image = makeImageToken({src: 'ok.png'});
        const inline = makeInlineToken([image], {lineNumber: 1});
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();

        findImagesInInlineTokens(params, 'YFM011', onError);

        expect(onError).not.toHaveBeenCalled();
    });

    it('default handler reports error without include source', () => {
        const image = makeImageToken({YFM011: 'oversized', src: 'big.png'}, {lineNumber: 3});
        const inline = makeInlineToken([image], {lineNumber: 3, line: '![img](big.png)'});
        const params = makeParams({tokens: [inline], name: 'test.md'});
        const onError = vi.fn();

        findImagesInInlineTokens(params, 'YFM011', onError);

        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0].lineNumber).toBe(3);
    });

    it('default handler reports error with include chain context', () => {
        const chain = [{file: 'main.md', line: 2}];
        const image = makeImageToken(
            {YFM011: 'oversized', src: 'big.png'},
            {lineNumber: 1, meta: {sourceFile: '_includes/media.md', includeChain: chain}},
        );
        const inline = makeInlineToken([image], {lineNumber: 2});
        const params = makeParams({tokens: [inline], lines: ['a', 'b', 'c']});
        const onError = vi.fn();

        findImagesInInlineTokens(params, 'YFM011', onError);

        expect(onError).toHaveBeenCalledOnce();
        const call = onError.mock.calls[0][0];
        expect(call.lineNumber).toBe(2);
        expect(call.context).toContain('main.md:2');
        expect(call.context).toContain('_includes/media.md:1');
        expect(call.context).toContain('↛');
        expect(call.context).toContain('big.png');
    });

    it('handles inline token with null children', () => {
        const inline = {
            type: 'inline',
            children: null,
            lineNumber: 1,
        } as unknown as MarkdownItToken;
        const params = makeParams({tokens: [inline]});
        const onError = vi.fn();

        findImagesInInlineTokens(params, 'YFM011', onError);

        expect(onError).not.toHaveBeenCalled();
    });
});

describe('findYfmLintTokens', () => {
    function makeYfmLintToken(
        attrs: Record<string, string | null>,
        opts?: {lineNumber?: number; line?: string},
    ): TokenWithAttrs {
        const attrsMap = new Map(Object.entries(attrs));
        return {
            type: '__yfm_lint',
            attrGet: (name: string) => attrsMap.get(name) ?? null,
            lineNumber: opts?.lineNumber || 1,
            line: opts?.line || '',
        } as TokenWithAttrs;
    }

    it('calls custom handler for matching yfm_lint tokens', () => {
        const token = makeYfmLintToken({YFM005: 'error'});
        const params = makeParams({tokens: [token]});
        const onError = vi.fn();
        const handler = vi.fn();

        findYfmLintTokens(params, 'YFM005', onError, handler);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(token);
        expect(onError).not.toHaveBeenCalled();
    });

    it('default handler reports error with lineNumber and context', () => {
        const token = makeYfmLintToken({YFM005: 'error'}, {lineNumber: 7, line: 'error context'});
        const params = makeParams({tokens: [token]});
        const onError = vi.fn();

        findYfmLintTokens(params, 'YFM005', onError);

        expect(onError).toHaveBeenCalledOnce();
        expect(onError).toHaveBeenCalledWith({lineNumber: 7, context: 'error context'});
    });

    it('skips tokens without matching rule attribute', () => {
        const token = makeYfmLintToken({YFM006: 'error'});
        const params = makeParams({tokens: [token]});
        const onError = vi.fn();

        findYfmLintTokens(params, 'YFM005', onError);

        expect(onError).not.toHaveBeenCalled();
    });

    it('skips non-yfm_lint tokens', () => {
        const token = {type: 'inline', attrGet: () => null} as unknown as MarkdownItToken;
        const params = makeParams({tokens: [token]});
        const onError = vi.fn();

        findYfmLintTokens(params, 'YFM005', onError);

        expect(onError).not.toHaveBeenCalled();
    });
});
