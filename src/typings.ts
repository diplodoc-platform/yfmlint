import type {Dictionary} from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type {Plugin} from 'markdownlint/lib/markdownlint';
import type {LogLevels} from './utils';

export interface LintConfig {
    default?: boolean;
    'log-levels': Record<string, LogLevels>;
    [x: string]: unknown;
}

export interface Options {
    plugins?: Function[] | Plugin;
    pluginOptions: Record<string, unknown>;
    lintConfig?: LintConfig;
    sourceMap?: Dictionary<string>;
    frontMatter?: RegExp | null;
}

export interface Logger {
    info(...args: string[]): void;
    warn(...args: string[]): void;
    error(...args: string[]): void;
}
