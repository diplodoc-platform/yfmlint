[![NPM version](https://img.shields.io/npm/v/@diplodoc/yfmlint.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/yfmlint)

# YFM syntax linter

## Usage

```
npm install @diplodoc/yfmlint
```

```javascript
import {yfmlint, log} from '@diplodoc/yfmlint';

const errors = await yfmlint(content, path, options);

if (errors) {
  resourcemap(errors);
  log(errors, logger);
}
```

## YFM rules

[All markdownlint rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)

### YFM001 - Inline code line length

Tags: line_length

Aliases: inline-code-length

Parameters: maximum

This rule is triggered when there are lines that are longer than the
configured `value` (default: 100 characters).

### YFM002 - No header found in the file for the link text

Tags: links

Aliases: no-header-found-for-link

This rule is triggered when there are no headers in the file referenced by the link.

### YFM003 - Link is unreachable

Tags: links

Aliases: unreachable-link

This rule is triggered when there is no file referenced by the link.

### YFM004 - Table not closed

Tags: table

Aliases: table-not-closed

This rule is triggered when table don't have close token.

### YFM005 - Tab list not closed

Tags: tab

Aliases: tab-list-not-closed

This rule is triggered when tab list don't have close token.

### YFM006 - Tab list not closed

Tags: term

Aliases: term-definition-duplicated

This rule is triggered when term definition duplicated.
