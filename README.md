[![NPM version](https://img.shields.io/npm/v/@diplodoc/yfmlint.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/yfmlint)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=diplodoc-platform_yfmlint&metric=alert_status)](https://sonarcloud.io/summary/overall?id=diplodoc-platform_yfmlint)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=diplodoc-platform_yfmlint&metric=coverage)](https://sonarcloud.io/summary/overall?id=diplodoc-platform_yfmlint)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=diplodoc-platform_yfmlint&metric=sqale_rating)](https://sonarcloud.io/summary/overall?id=diplodoc-platform_yfmlint)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=diplodoc-platform_yfmlint&metric=reliability_rating)](https://sonarcloud.io/summary/overall?id=diplodoc-platform_yfmlint)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=diplodoc-platform_yfmlint&metric=security_rating)](https://sonarcloud.io/summary/overall?id=diplodoc-platform_yfmlint)

# YFM syntax linter

YFM (Yandex Flavored Markdown) syntax linter with custom rules for Diplodoc platform. Extends [markdownlint](https://github.com/DavidAnson/markdownlint) with YFM-specific validation rules.

## Features

- **11 custom YFM rules** (YFM001-YFM011) for validating YFM-specific syntax
- **Integration with markdownlint** - all standard markdownlint rules are available
- **Plugin support** - integrates with plugins from `@diplodoc/transform` (e.g., `term` plugin)
- **Configurable rule levels** - error, warn, info, or disabled
- **Source map support** - accurate error reporting after Liquid template processing

## Installation

```bash
npm install @diplodoc/yfmlint
```

## Usage

### Basic Example

```javascript
import {yfmlint, log, LogLevels} from '@diplodoc/yfmlint';

const content = `# Title

[Link to missing file](./missing.md)
`;

const errors = await yfmlint(content, 'example.md', {
  lintConfig: {
    YFM003: LogLevels.ERROR, // Unreachable link
  },
});

if (errors && errors.length > 0) {
  log(errors, console);
}
```

### With Plugins

```javascript
import {yfmlint} from '@diplodoc/yfmlint';
import termPlugin from '@diplodoc/transform/plugins/term';

const errors = await yfmlint(content, path, {
  plugins: [termPlugin],
  pluginOptions: {
    // Plugin-specific options
  },
  lintConfig: {
    YFM007: true, // Term used without definition
    YFM009: 'warn', // Term definition not at end of file
  },
});
```

### Configuration

Rules can be configured with different log levels:

```javascript
const lintConfig = {
  // Boolean: true = warn, false = disabled
  YFM001: true,
  YFM002: false,

  // String: log level name
  YFM003: 'error',
  YFM004: 'warn',
  YFM005: 'info',

  // Object: full configuration
  YFM001: {
    level: 'warn',
    maximum: 120, // Custom parameter
  },
};
```

## Documentation

For detailed information about architecture, development, and contributing, see [AGENTS.md](./AGENTS.md).

## YFM Rules

This package extends markdownlint with 11 custom rules for YFM syntax validation. All standard [markdownlint rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) are also available.

### YFM001 - Inline code line length

**Tags:** `line_length`  
**Aliases:** `inline-code-length`  
**Parameters:** `maximum` (default: 100)

Validates that inline code spans don't exceed the maximum length. Useful for preventing overly long inline code that breaks formatting.

**Example:**

```markdown
`this is a very long inline code that exceeds the maximum length and will trigger YFM001`
```

### YFM002 - No header found for link

**Tags:** `links`  
**Aliases:** `no-header-found-for-link`

Validates that links to headers (anchors) reference existing headers in the target file.

**Example:**

```markdown
[Link to non-existent header](./file.md#nonexistent)
```

### YFM003 - Unreachable link

**Tags:** `links`  
**Aliases:** `unreachable-link`

Validates that linked files exist and are accessible. Checks for:

- File not found
- File missing in table of contents
- Both conditions

**Example:**

```markdown
[Link to missing file](./missing.md)
```

### YFM004 - Table not closed

**Tags:** `table`  
**Aliases:** `table-not-closed`

Validates that YFM tables are properly closed. Requires the `table` plugin from `@diplodoc/transform`.

### YFM005 - Tab list not closed

**Tags:** `tab`  
**Aliases:** `tab-list-not-closed`

Validates that YFM tab lists are properly closed. Requires the `tabs` plugin from `@diplodoc/transform`.

### YFM006 - Term definition duplicated

**Tags:** `term`  
**Aliases:** `term-definition-duplicated`

Validates that term definitions are not duplicated. Requires the `term` plugin from `@diplodoc/transform`.

**Example:**

```markdown
[term]: definition

[term]: another definition <!-- Error: duplicate definition -->
```

### YFM007 - Term used without definition

**Tags:** `term`  
**Aliases:** `term-used-without-definition`

Validates that all used terms have corresponding definitions. Requires the `term` plugin from `@diplodoc/transform`.

**Example:**

```markdown
This uses [term] but no definition is provided.
```

### YFM008 - Term inside definition not allowed

**Tags:** `term`  
**Aliases:** `term-inside-definition-not-allowed`

Validates that term definitions don't contain other terms. Requires the `term` plugin from `@diplodoc/transform`.

### YFM009 - Term definition not at end of file

**Tags:** `term`  
**Aliases:** `no-term-definition-in-content`

Validates that all term definitions are placed at the end of the file. Requires the `term` plugin from `@diplodoc/transform`.

**Example:**

```markdown
[term]: definition

Some content here <!-- Error: content after term definitions -->

[another-term]: another definition
```

### YFM010 - Unreachable autotitle anchor

**Tags:** `titles`  
**Aliases:** `unreachable-autotitle-anchor`

Validates that links to autotitle anchors reference existing titles.

**Example:**

```markdown
[Link to non-existent title](#nonexistent-title)
```

### YFM011 - Max SVG size

**Tags:** `image_svg`  
**Aliases:** `max-svg-size`

Validates that SVG images don't exceed the maximum size limit. Requires image processing plugins from `@diplodoc/transform`.
