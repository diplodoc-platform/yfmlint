import type {LintError, Options} from './typings';

import attrs from 'markdown-it-attrs';

import defaultLintConfig from './config';
import * as rules from './rules';
import {getLogLevel, normalizeConfig} from './utils';

export type {LintConfig, RawLintConfig} from './typings';

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

    // Signal to plugins that this is a lint run (not a transform run)
    // Plugins from @diplodoc/transform use this flag to create __yfm_lint tokens
    // and set attributes (e.g., YFM003, YFM007) for rule validation
    pluginOptions.isLintRun = true;

    const config = normalizeConfig(defaultLintConfig, lintConfig);
    // Add markdown-it-attrs plugin by default to support attribute syntax in markdown
    // Custom plugins are added after attrs plugin
    const plugins =
        (customPlugins && customPlugins.length && [attrs, ...customPlugins]) || undefined;
    // markdownlint expects plugins in format: [plugin, options]
    // This allows passing pluginOptions to all plugins
    const preparedPlugins = plugins && plugins.map((plugin) => [plugin, pluginOptions]);

    const errors = await lint({
        strings: {[path]: content},
        markdownItPlugins: preparedPlugins,
        // Continue processing even if a rule throws an error
        // This prevents one failing rule from stopping the entire lint process
        handleRuleFailures: true,
        frontMatter,
        config,
        customRules: Object.values(rules),
    });

    return errors[path].map((error) => {
        (error as LintError).level = getLogLevel(config, error.ruleNames);
        // Override toString() to provide custom error formatting
        // Format: "path:line: ruleName description [detail] [Context: ...]"
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
