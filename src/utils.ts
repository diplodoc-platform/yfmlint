import type {LintConfig, LintError, Logger, RawLintConfig, RuleConfig} from './typings';

import merge from 'lodash/merge';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

const DEFAULT_LOG_LEVEL = LogLevels.WARN;

/**
 * Normalizes and merges multiple lint configurations.
 *
 * Accepts various input formats and converts them to a unified LintConfig:
 * - boolean: true -> {loglevel: 'warn'}, false -> {loglevel: 'disabled'}
 * - string: log level name -> {loglevel: '...'}
 * - object: {level: '...', ...} -> {loglevel: '...', ...}
 *
 * After merging, simplifies config by converting {loglevel: 'disabled'} to false.
 *
 * @param {...RawLintConfig} parts - One or more configuration objects to normalize and merge
 * @returns {LintConfig} Normalized and merged configuration
 */
export function normalizeConfig(...parts: RawLintConfig[]) {
    /**
     * Simplifies config: replace {loglevel: 'disabled'} with false for cleaner output.
     *
     * @param {LintConfig} config - Configuration to simplify
     * @returns {LintConfig} Simplified configuration
     */
    const simplify = (config: LintConfig) => {
        return Object.keys(config).reduce((result, key) => {
            if ((config[key] as {loglevel: LogLevels}).loglevel === LogLevels.DISABLED) {
                config[key] = false;
            }

            return result;
        }, config);
    };
    // Normalize each config part to unified format
    const normalized = parts.map((part) => {
        return Object.keys(part).reduce((result, key) => {
            if (key === 'default') {
                // 'default' key is passed through as-is
                result[key] = part[key];
            } else if (typeof part[key] === 'boolean') {
                // boolean: true -> warn, false -> disabled
                result[key] = {
                    loglevel: part[key] ? DEFAULT_LOG_LEVEL : LogLevels.DISABLED,
                };
            } else if (part[key] === LogLevels.DISABLED) {
                // Direct log level string 'disabled'
                result[key] = {
                    loglevel: LogLevels.DISABLED,
                };
            } else if (typeof part[key] === 'string') {
                // Log level string (e.g., 'warn', 'error')
                result[key] = {
                    loglevel: part[key] as LogLevels,
                };
            } else if (part[key] && typeof part[key] === 'object') {
                // Object config: merge with loglevel from 'level' property or default
                result[key] = {
                    ...(part[key] as object),
                    // @ts-ignore
                    loglevel: part[key].level || DEFAULT_LOG_LEVEL,
                };
            }

            return result;
        }, {} as LintConfig);
    });

    const merged = merge({}, ...normalized);

    return simplify(merged);
}

/**
 * Gets log level for a rule based on its names.
 * Rules can have multiple names (e.g., ['YFM001', 'inline-code-length']).
 * Returns the log level for the first matching rule name, or default if none found.
 *
 * @param {LintConfig} logLevels - Configuration object mapping rule names to log levels
 * @param {string[]} ruleNames - Array of rule names (e.g., ['YFM001', 'inline-code-length'])
 * @returns {LogLevels} Log level for the rule, or default if not configured
 */
export function getLogLevel(logLevels: LintConfig, ruleNames: string[]): LogLevels {
    return (
        ruleNames.map((ruleName) => {
            if (!logLevels[ruleName]) {
                return LogLevels.DISABLED;
            }

            return (logLevels[ruleName] as RuleConfig).loglevel;
        })[0] || DEFAULT_LOG_LEVEL
    );
}

export function log(errors: LintError[], logger: Logger) {
    for (const error of errors) {
        const message = String(error);

        switch (error.level) {
            case LogLevels.ERROR:
                logger.error(message);
                break;
            case LogLevels.WARN:
                logger.warn(message);
                break;
            case LogLevels.DISABLED:
            default:
                break;
        }
    }
}
