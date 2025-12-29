import {LogLevels} from './utils';

export default {
    // Default state for all rules
    default: false,

    // Inline code length
    YFM001: {
        level: LogLevels.WARN,
        maximum: 100,
    },
    YFM002: LogLevels.WARN, // No header found in the file for the link text
    YFM003: LogLevels.ERROR, // Link is unreachable
    YFM004: LogLevels.ERROR, // Table not closed
    YFM005: LogLevels.ERROR, // Tab list not closed
    YFM006: LogLevels.WARN, // Term definition duplicated
    YFM007: LogLevels.WARN, // Term used without definition
    YFM008: LogLevels.WARN, // Term inside definition not allowed
    YFM009: LogLevels.WARN, // Term definition used not at the end of file
    YFM010: LogLevels.WARN, // Autotitle anchor is missed
    YFM011: LogLevels.WARN, // Max svg size
};
