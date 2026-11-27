declare module 'markdownlint/helpers' {
    export function frontMatterHasTitle(lines: readonly string[]): boolean;
    export function isBlankLine(line: string): boolean;
}
