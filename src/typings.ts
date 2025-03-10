import type {LintError as BaseLintError} from 'markdownlint';
import type {LogLevels} from './utils';

export type RawLintConfig = {
    default?: boolean;
} & {
    [x: string]:
        | LogLevels
        | boolean
        | ({
              level?: LogLevels;
          } & {
              [x: string]: unknown;
          });
};

export type LintConfig = {
    default?: boolean;
} & {
    [x: string]:
        | false
        | ({
              level: LogLevels;
          } & {
              [x: string]: unknown;
          });
};

export interface Options {
    plugins?: Function[];
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
