import type {LintError, Options} from './typings';

import attrs from 'markdown-it-attrs';

import defaultLintConfig from './config';
import * as rules from './rules';
import {getLogLevel, normalizeConfig} from './utils';

export {LogLevels, log, getLogLevel, normalizeConfig} from './utils';

export async function yfmlint(
    content: string,
    path: string,
    opts: Options,
): Promise<LintError[] | undefined> {
    // @ts-ignore
    const {lint} = await import('markdownlint/promise');
    const {
        plugins: customPlugins = [],
        pluginOptions = {},
        frontMatter = null,
        lintConfig = {},
    } = opts;

    pluginOptions.isLintRun = true;

    const config = normalizeConfig(defaultLintConfig, lintConfig);
    const plugins =
        (customPlugins && customPlugins.length && [attrs, ...customPlugins]) || undefined;
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    const errors = await lint({
        strings: {[path]: content},
        markdownItPlugins: preparedPlugins,
        handleRuleFailures: true,
        frontMatter,
        config,
        customRules: Object.values(rules),
    });

    return errors[path].map((error) => {
        (error as LintError).level = getLogLevel(config, error.ruleNames);
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
            const ruleMoniker = ruleNames ? ruleNames.join(' / ') : ruleName + ' / ' + ruleAlias;

            return (
                `${path}${lineNumber ? `: ${lineNumber}:` : ':'} ${ruleMoniker} ${ruleDescription}` +
                (errorDetail ? ` [${errorDetail}]` : '') +
                (errorContext ? ` [Context: "${errorContext}"]` : '')
            );
        };

        return error as LintError;
    });
}
