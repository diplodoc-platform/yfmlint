import type {LintError as BaseLintError, MarkdownItToken} from 'markdownlint';
import type {LogLevels} from './utils';

// Re-export BaseLintError for use in index.ts
export type {BaseLintError};

// Markdown-it plugin type (simplified - markdownlint accepts plugins in [plugin, options] format)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MarkdownItPlugin = any;

export type RawLintConfig = {
    default?: boolean;
} & {
    [x: string]: LogLevels | boolean | Partial<RuleConfig>;
};

export type RuleConfig = {
    loglevel: LogLevels;
} & {
    [x: string]: unknown;
};

export type LintConfig = {
    default?: boolean;
} & {
    [x: string]: false | RuleConfig;
};

export interface Options {
    plugins?: MarkdownItPlugin[];
    pluginOptions?: Record<string, unknown>;
    lintConfig?: RawLintConfig;
    frontMatter?: RegExp | null;
}

export interface Logger {
    info(...args: string[]): void;
    warn(...args: string[]): void;
    error(...args: string[]): void;
}

export interface LintError extends BaseLintError {
    level: LogLevels;
}

export type TokenWithAttrs = MarkdownItToken & {
    attrGet(name: string): string | null;
};
