import type {LintError, Logger} from './typings';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

export function getLogLevel(
    logLevels: Record<string, LogLevels>,
    ruleNames: string[],
    defaultLevel: LogLevels,
) {
    const ruleName = ruleNames.filter(
        (ruleName) => ruleName in logLevels,
    )[0] as keyof typeof logLevels;

    return logLevels[ruleName] || defaultLevel;
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
