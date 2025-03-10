import type {LintConfig, LintError, Logger, RawLintConfig} from './typings';

import merge from 'lodash/merge';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

const DEFAULT_LOG_LEVEL = LogLevels.WARN;

export function normalizeConfig(...parts: RawLintConfig[]) {
    const normalized = parts.map((part) => {
        return Object.keys(part).reduce((result, key) => {
            if (key === 'default') {
                result[key] = part[key];
            } else {
                if (typeof part[key] === 'boolean') {
                    result[key] = part[key]
                        ? {
                              level: DEFAULT_LOG_LEVEL,
                          }
                        : false;
                }

                if (typeof part[key] === 'string') {
                    result[key] = {
                        level: part[key] as LogLevels,
                    };
                }

                if (part[key] && typeof part[key] === 'object') {
                    result[key] = {
                        ...(part[key] as object),
                        // @ts-ignore
                        level: part[key].level || DEFAULT_LOG_LEVEL,
                    };
                }
            }

            return result;
        }, {} as LintConfig);
    });

    return merge({}, ...normalized);
}

export function getLogLevel(logLevels: LintConfig, ruleNames: string[]) {
    return (
        ruleNames.map((ruleName) => {
            if (!logLevels[ruleName]) {
                return LogLevels.DISABLED;
            }

            // @ts-ignore
            return logLevels[ruleName].level;
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
