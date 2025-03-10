import type {LintError, Options} from './typings';

import merge from 'lodash/merge';
import attrs from 'markdown-it-attrs';

import defaultLintConfig from './config';
import * as rules from './rules';
import {LogLevels, getLogLevel} from './utils';

export async function yfmlint(content: string, path: string, opts: Options) {
    // @ts-ignore
    const {lint} = import('markdownlint/promise');
    const {plugins: customPlugins, pluginOptions, frontMatter = null} = opts;

    pluginOptions.isLintRun = true;

    const config = merge({}, defaultLintConfig, opts.lintConfig || {});

    const plugins = customPlugins && [attrs, ...customPlugins];
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    try {
        const errors = await lint({
            strings: {[path]: content},
            markdownItPlugins: preparedPlugins,
            handleRuleFailures: true,
            frontMatter,
            config,
            customRules: Object.values(rules),
        })[path];

        return errors.map((error: LintError) => {
            error.level = getLogLevel(config['log-levels'], error.ruleNames, LogLevels.WARN);
            error.toString = function () {
                const {
                    lineNumber,
                    errorDetail,
                    errorContext,
                    ruleNames,
                    // @ts-expect-error bad markdownlint typings
                    ruleName,
                    // @ts-expect-error bad markdownlint typings
                    ruleAlias,
                    ruleDescription,
                } = error;
                const ruleMoniker = ruleNames
                    ? ruleNames.join(' / ')
                    : ruleName + ' / ' + ruleAlias;

                return (
                    `${path}${lineNumber ? `: ${lineNumber}:` : ':'} ${ruleMoniker} ${ruleDescription}` +
                    (errorDetail ? ` [${errorDetail}]` : '') +
                    (errorContext ? ` [Context: "${errorContext}"]` : '')
                );
            };

            return error;
        });
    } catch {}
}
