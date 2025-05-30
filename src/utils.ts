import type {LintConfig, LintError, Logger, RawLintConfig, RuleConfig} from './typings';

import merge from 'lodash/merge';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

const DEFAULT_LOG_LEVEL = LogLevels.WARN;

export function normalizeConfig(...parts: RawLintConfig[]) {
    const simplify = (config: LintConfig) => {
        return Object.keys(config).reduce((result, key) => {
            if ((config[key] as {loglevel: LogLevels}).loglevel === LogLevels.DISABLED) {
                config[key] = false;
            }

            return result;
        }, config);
    };
    const normalized = parts.map((part) => {
        return Object.keys(part).reduce((result, key) => {
            if (key === 'default') {
                result[key] = part[key];
            } else if (typeof part[key] === 'boolean') {
                result[key] = {
                    loglevel: part[key] ? DEFAULT_LOG_LEVEL : LogLevels.DISABLED,
                };
            } else if (part[key] === LogLevels.DISABLED) {
                result[key] = {
                    loglevel: LogLevels.DISABLED,
                };
            } else if (typeof part[key] === 'string') {
                result[key] = {
                    loglevel: part[key] as LogLevels,
                };
            } else if (part[key] && typeof part[key] === 'object') {
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
