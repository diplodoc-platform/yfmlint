import type {LogLevels} from './utils';

// Keep the bundled linter private and the published diagnostics structural.
export interface BaseLintError {
    lineNumber: number;
    ruleNames: string[];
    ruleDescription: string;
    ruleInformation: string;
    errorDetail: string;
    errorContext: string;
    errorRange: number[];
    fixInfo?: {
        lineNumber?: number;
        editColumn?: number;
        deleteCount?: number;
        insertText?: string;
    };
}

// Markdown-it plugin used by the lint parser.
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

/** Source attribution attached by an include host to its owned token copies. */
export interface TokenSourceInfo {
    sourceFile: string;
    includeChain: Array<{file: string; line: number}>;
}

export interface Options {
    /** Parse general Markdown attributes; defaults to true independently of custom plugins. */
    enableMarkdownAttrs?: boolean;
    plugins?: MarkdownItPlugin[];
    pluginOptions?: Record<string, unknown>;
    lintConfig?: RawLintConfig;
    frontMatter?: RegExp | null;
    trimPageConstructor?: boolean;
}

export interface Logger {
    info(...args: string[]): void;
    warn(...args: string[]): void;
    error(...args: string[]): void;
}

export interface LintError extends BaseLintError {
    level: LogLevels;
}
