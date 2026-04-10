export const NOTE_OPEN_RE = /^note(?:\s|$)/;
export const NOTE_CLOSE_RE = /^endnote$/;

export const CUT_OPEN_RE = /^cut(?:\s|$)/;
export const CUT_CLOSE_RE = /^endcut$/;

export const TABS_OPEN_RE = /^list\s+tabs(?:\s|$)/;
export const TABS_CLOSE_RE = /^endlist$/;

const INCLUDE_RE = /^include(?:\s|$)/;
const INCLUDED_OPEN_RE = /^included\s*\(.+\)$/;
const INCLUDED_CLOSE_RE = /^endincluded$/;
const ANCHOR_RE = /^anchor\s+[\w-]+$/;
const FILE_RE = /^file\s+.+$/;
const CHANGELOG_OPEN_RE = /^changelog$/;
const CHANGELOG_CLOSE_RE = /^endchangelog$/;
export const IF_OPEN_RE = /^if\s+.+$/;
const ELSIF_RE = /^elsif\s+.+$/;
const ELSE_RE = /^else$/;
export const IF_CLOSE_RE = /^endif$/;
export const FOR_OPEN_RE = /^for\s+.+\s+in\s+.+$/;
export const FOR_CLOSE_RE = /^endfor$/;

export function isKnownDirective(directive: string): boolean {
    return (
        NOTE_OPEN_RE.test(directive) ||
        NOTE_CLOSE_RE.test(directive) ||
        CUT_OPEN_RE.test(directive) ||
        CUT_CLOSE_RE.test(directive) ||
        TABS_OPEN_RE.test(directive) ||
        TABS_CLOSE_RE.test(directive) ||
        INCLUDE_RE.test(directive) ||
        INCLUDED_OPEN_RE.test(directive) ||
        INCLUDED_CLOSE_RE.test(directive) ||
        ANCHOR_RE.test(directive) ||
        FILE_RE.test(directive) ||
        CHANGELOG_OPEN_RE.test(directive) ||
        CHANGELOG_CLOSE_RE.test(directive) ||
        IF_OPEN_RE.test(directive) ||
        ELSIF_RE.test(directive) ||
        ELSE_RE.test(directive) ||
        IF_CLOSE_RE.test(directive) ||
        FOR_OPEN_RE.test(directive) ||
        FOR_CLOSE_RE.test(directive)
    );
}
