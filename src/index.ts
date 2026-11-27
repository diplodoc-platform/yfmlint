import type {LintError, Options} from './typings';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';

import defaultLintConfig from './config';
import {prepareFrontMatter, protectPluginMetadata} from './markdownlint';
import * as rules from './rules';
import {captureBlockDirectives} from './rules/block-directives';
import {getLogLevel, normalizeConfig} from './utils';

export type {LintConfig, RawLintConfig, TokenSourceInfo} from './typings';

export {LogLevels, log, getLogLevel, normalizeConfig} from './utils';

export async function yfmlint(
    content: string,
    path: string,
    opts: Options,
): Promise<LintError[] | undefined> {
    // The engine is ESM; retain the CommonJS package entry point.
    const {lint} = await import('markdownlint/promise');
    const {
        plugins: customPlugins = [],
        enableMarkdownAttrs = true,
        pluginOptions = {},
        frontMatter = null,
        trimPageConstructor = true,
        lintConfig = {},
    } = opts;

    // Trim page-constructor blocks before linting — markdownlint doesn't know about them.
    // Wrap replacement in markdownlint-disable/enable to suppress rules (e.g. MD012)
    // on the blank lines that preserve line numbering.
    if (trimPageConstructor) {
        const PAGE_CONSTRUCTOR_REGEX = /^::: page-constructor\r?\n[\s\S]*?\r?\n:::(?:\r?\n|$)/gm;

        content = content.replace(PAGE_CONSTRUCTOR_REGEX, (match) => {
            const lineCount = match.split(/\r?\n/).length - 1;

            if (lineCount <= 2) {
                return '<!-- markdownlint-disable -->\n<!-- markdownlint-enable -->\n';
            }

            return (
                '<!-- markdownlint-disable -->\n' +
                '\n'.repeat(lineCount - 2) +
                '<!-- markdownlint-enable -->\n'
            );
        });
    }

    // Signal to plugins that this is a lint run (not a transform run)
    // Plugins from @diplodoc/transform use this flag to create __yfm_lint tokens
    // and set attributes (e.g., YFM003, YFM007) for rule validation
    pluginOptions.isLintRun = true;

    const config = normalizeConfig(defaultLintConfig, lintConfig);
    // Attribute parsing is independent of whether callers install other plugins.
    const plugins = [
        captureBlockDirectives,
        ...(enableMarkdownAttrs ? [attrs] : []),
        ...(customPlugins || []),
    ];
    const markdownItFactory = () => {
        const md = new MarkdownIt({html: true});
        md.linkify.set({fuzzyLink: true, urlAuth: true});
        for (const plugin of plugins) {
            md.use(plugin, pluginOptions);
        }

        protectPluginMetadata(md);

        return md;
    };
    const input = prepareFrontMatter(content, frontMatter);

    const errors = await lint({
        strings: {[path]: input.content},
        markdownItFactory,
        // Continue processing even if a rule throws an error
        // This prevents one failing rule from stopping the entire lint process
        handleRuleFailures: true,
        frontMatter: input.frontMatter,
        config,
        customRules: Object.values(rules),
    });

    return errors[path].map(({severity: _severity, ...diagnostic}) => {
        const level = getLogLevel(config, diagnostic.ruleNames);
        const error = {...diagnostic, level} as LintError;

        // Keep the package's configured level and diagnostic text format.
        error.toString = function () {
            const {lineNumber, errorDetail, errorContext, ruleNames, ruleDescription} = error;
            const ruleMoniker = ruleNames.join(' / ');

            return (
                `${path}${lineNumber ? `: ${lineNumber}:` : ':'} ${ruleMoniker} ${ruleDescription}` +
                (errorDetail ? ` [${errorDetail}]` : '') +
                (errorContext ? ` [Context: "${errorContext}"]` : '')
            );
        };

        return error;
    });
}
