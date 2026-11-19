import type {MarkdownItToken} from 'markdownlint';

export type TokenWithAttrs = MarkdownItToken & {
    attrGet(name: string): string | null;
};
