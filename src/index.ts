import {sync} from 'markdownlint';
import merge from 'lodash/merge';
import attrs from 'markdown-it-attrs';

import {LogLevels, Logger} from '../log';

import defaultLintConfig from './yfmlint';
import {
    yfm001,
    yfm002,
    yfm003,
    yfm004,
    yfm005,
    yfm006,
    yfm007,
    yfm008,
    yfm009,
} from './markdownlint-custom-rule';
import {errorToString, getLogLevel} from './utils';
import {Options} from './typings';

const lintRules = [yfm001, yfm002, yfm003, yfm004, yfm005, yfm006, yfm007, yfm008, yfm009];

export interface PluginOptions {
    log: Logger;
    path?: string;
    [key: string]: unknown;
}

export interface LintConfig {
    default?: boolean;
    'log-levels': Record<string, LogLevels>;
    [x: string]: unknown;
}

export default function yfmlint(content: string, opts: Options) {
    const {plugins: customPlugins, pluginOptions, sourceMap} = opts;
    const {path = 'input', log} = pluginOptions;

    pluginOptions.isLintRun = true;

    const {
        LogLevels: {ERROR, WARN, DISABLED},
    } = log;

    const lintConfig = merge({}, defaultLintConfig, opts.lintConfig || {});

    const plugins = customPlugins && [attrs, ...customPlugins];
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    let errors;
    try {
        errors = sync({
            strings: {[path]: content},
            markdownItPlugins: preparedPlugins,
            handleRuleFailures: true,
            frontMatter: null,
            config: lintConfig,
            customRules: lintRules,
        })[path];
    } catch {}

    if (!errors) {
        return;
    }

    const logLevelsConfig = lintConfig['log-levels'];

    for (const error of errors) {
        const message = errorToString(path, error, sourceMap);
        const logLevel = getLogLevel({
            logLevelsConfig,
            ruleNames: error.ruleNames,
            defaultLevel: WARN,
        });

        switch (logLevel) {
            case ERROR:
                log.error(message);
                break;
            case WARN:
                log.warn(message);
                break;
            case DISABLED:
            default:
                break;
        }
    }
}
