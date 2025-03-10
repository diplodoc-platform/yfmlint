import type {LintError} from 'markdownlint/lib/markdownlint';
import type {LintConfig, Logger} from './typings';

export enum LogLevels {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DISABLED = 'disabled',
}

export function getLogLevel(opts: {
    ruleNames: string[];
    logLevels: Record<string, LogLevels>;
    defaultLevel: LogLevels;
}) {
    const {ruleNames, logLevels, defaultLevel} = opts;
    const ruleName = ruleNames.filter(
        (ruleName) => ruleName in logLevels,
    )[0] as keyof typeof logLevels;

    return logLevels[ruleName] || defaultLevel;
}

export function log(config: LintConfig, errors: LintError[], logger: Logger) {
    const logLevels = config['log-levels'];

    for (const error of errors) {
        const message = String(error);
        const logLevel = getLogLevel({
            logLevels,
            ruleNames: error.ruleNames,
            defaultLevel: LogLevels.WARN,
        });

        switch (logLevel) {
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
