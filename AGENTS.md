# AGENTS.md

This file contains instructions for AI agents working with the `@diplodoc/yfmlint` project.

## Common Rules and Standards

**Important**: This package follows common rules and standards defined in the Diplodoc metapackage. When working in metapackage mode, refer to:

- **`.agents/style-and-testing.md`** in the metapackage root for:
  - Code style guidelines
  - Commit message format (Conventional Commits)
  - Pre-commit hooks rules (**CRITICAL**: Never commit with `--no-verify`)
  - Testing standards
  - Documentation requirements
- **`.agents/core.md`** for core concepts
- **`.agents/monorepo.md`** for workspace and dependency management
- **`.agents/dev-infrastructure.md`** for build and CI/CD

**Note**: In standalone mode (when this package is used independently), these rules still apply. If you need to reference the full documentation, check the [Diplodoc metapackage repository](https://github.com/diplodoc-platform/diplodoc).

## Project Description

`@diplodoc/yfmlint` is a linter for YFM (Yandex Flavored Markdown) files. It extends [markdownlint](https://github.com/DavidAnson/markdownlint) with custom rules specific to YFM syntax and Diplodoc platform features.

**Key Features**:

- Lints YFM files with custom rules (YFM001-YFM011)
- Integrates with markdownlint for standard Markdown rules
- Supports YFM-specific plugins from `@diplodoc/transform` (e.g., `term` plugin)
- Configurable rule levels (error, warn, info, disabled)
- Source map support for accurate error reporting after Liquid template processing
- Used by `@diplodoc/cli` during documentation build process

**Primary Use Case**: Validates YFM documentation files before publication, ensuring correct syntax, structure, and adherence to YFM conventions.

## Project Structure

### Main Directories

- `src/` — source code
  - `index.ts` — main entry point, exports `yfmlint` function
  - `config.ts` — default lint configuration with all YFM rules
  - `utils.ts` — utility functions (LogLevels, normalizeConfig, getLogLevel, log)
  - `typings.ts` — TypeScript type definitions
  - `rules/` — custom YFM linting rules
    - `helpers.ts` — helper functions for common rule patterns (findLinksInInlineTokens, findImagesInInlineTokens, findYfmLintTokens)
    - `yfm001.ts` — inline code line length
    - `yfm002.ts` — no header found for link
    - `yfm003.ts` — unreachable link
    - `yfm004.ts` — table not closed
    - `yfm005.ts` — tab list not closed
    - `yfm006.ts` — term definition duplicated
    - `yfm007.ts` — term used without definition
    - `yfm008.ts` — term inside definition not allowed
    - `yfm009.ts` — term definition not at end of file
    - `yfm010.ts` — autotitle anchor missed
    - `yfm011.ts` — max SVG size
- `test/` — test files
  - `yfm001.test.ts`, `yfm004.test.ts`, `yfm009.test.ts` — rule tests
  - `__snapshots__/` — test snapshots
  - `utils.ts` — test utilities
- `build/` — compiled output (generated)
- `esbuild/` — build configuration

### Configuration Files

- `package.json` — package metadata and dependencies
- `tsconfig.json` — TypeScript configuration
- `tsconfig.transform.json` — TypeScript configuration for build
- `vitest.config.mjs` — Vitest test configuration

## Tech Stack

This package follows the standard Diplodoc platform tech stack. See `.agents/dev-infrastructure.md` and `.agents/style-and-testing.md` in the metapackage root for detailed information.

**Package-specific details**:

- **Language**: TypeScript
- **Runtime**: Node.js >=11.5.1 (npm requirement)
- **Testing**: Vitest with snapshot testing
- **Build**: esbuild + TypeScript compiler for type definitions
- **Dependencies**:
  - `markdownlint` — base linting engine (custom fork: `github:diplodoc-platform/markdownlint#no-parse-micromark`)
  - `@diplodoc/transform` — YFM transform plugins (e.g., `term` plugin)
  - `markdown-it-attrs` — markdown-it plugin for attributes

## Usage Modes

This package can be used in two different contexts:

### 1. As Part of Metapackage (Workspace Mode)

When `@diplodoc/yfmlint` is part of the Diplodoc metapackage:

- Located at `packages/yfmlint/` in the metapackage
- Linked via npm workspaces
- Dependencies are shared from metapackage root `node_modules`
- Can be developed alongside other packages
- Changes are immediately available to other packages via workspace linking

**Development in Metapackage**:

```bash
# From metapackage root
cd packages/yfmlint
npm install  # Uses workspace dependencies

# Build
npm run build

# Test
npm test
```

**Using from Other Packages in Metapackage**:

- `@diplodoc/cli` uses `yfmlint` during build process
- Workspace linking ensures local version is used
- No need to publish to npm for local development

### 2. As Standalone Package (Independent Mode)

When `@diplodoc/yfmlint` is used as a standalone npm package:

- Installed via `npm install @diplodoc/yfmlint`
- Has its own `node_modules` with all dependencies
- Can be cloned and developed independently
- Must be published to npm for others to use

**Development Standalone**:

```bash
# Clone the repository
git clone git@github.com:diplodoc-platform/yfmlint.git
cd yfmlint
npm install  # Installs all dependencies locally

# Build
npm run build

# Test
npm test
```

**Using in External Projects**:

```javascript
import {yfmlint, log, LogLevels} from '@diplodoc/yfmlint';

const errors = await yfmlint(content, path, {
  lintConfig: {
    YFM001: LogLevels.ERROR,
    YFM002: LogLevels.WARN,
  },
  plugins: [termPlugin], // Optional: YFM plugins
  pluginOptions: {}, // Optional: plugin options
  frontMatter: null, // Optional: front matter regex
});

if (errors) {
  log(errors, logger);
}
```

### Important Considerations

**Dependency Management**:

- In metapackage: May use dependencies from root `node_modules`
- Standalone: Must have all dependencies in local `node_modules`
- Both modes should work identically from user perspective

**Package Lock Management**:

- When adding/updating dependencies, use `npm i --no-workspaces --package-lock-only` to regenerate `package-lock.json` for standalone mode
- This ensures `package-lock.json` is valid when package is used outside workspace
- Always regenerate after dependency changes to maintain standalone compatibility

**Testing**:

- Test setup works in both modes
- Uses Vitest with snapshot testing
- When testing, ensure dependencies are properly resolved
- Consider testing both modes if making significant changes

## Architecture

### Markdownlint Integration

**Important**: `yfmlint` uses markdownlint with **markdown-it token stream** (not micromark). This is a critical architectural detail:

- markdownlint supports two parsers: markdown-it and micromark
- `yfmlint` uses the markdown-it parser (`parser: 'markdownit'` in all rules)
- This allows integration with markdown-it plugins from `@diplodoc/transform`
- The package uses a custom fork of markdownlint: `github:diplodoc-platform/markdownlint#no-parse-micromark`
- **Do not update to standard markdownlint** without ensuring markdown-it support is maintained

### Core Function: `yfmlint`

The main entry point is the `yfmlint` function:

```typescript
async function yfmlint(
  content: string,
  path: string,
  opts: Options,
): Promise<LintError[] | undefined>;
```

**Parameters**:

- `content` — YFM file content as string
- `path` — file path (used for error reporting)
- `opts` — options object:
  - `plugins` — optional array of markdown-it plugins (e.g., `term` plugin from `@diplodoc/transform`)
  - `pluginOptions` — optional object passed to plugins
  - `lintConfig` — optional custom lint configuration (merged with defaults)
  - `frontMatter` — optional regex for front matter detection

**Returns**: Array of `LintError` objects or `undefined` if no errors

**How it works**:

1. Normalizes configuration (merges default config with custom `lintConfig`)
2. Prepares markdown-it plugins (adds `markdown-it-attrs` by default, plus custom plugins)
3. Sets `pluginOptions.isLintRun = true` to signal plugins this is a lint run
4. Calls `markdownlint.lint()` with:
   - File content and path
   - Prepared markdown-it plugins (creates markdown-it token stream)
   - Normalized configuration
   - Custom YFM rules (YFM001-YFM011) that work with markdown-it tokens
5. markdownlint processes content using markdown-it parser (not micromark)
6. Rules receive markdown-it token stream via `params.parsers.markdownit.tokens`
7. Maps errors and adds log levels based on configuration
8. Returns array of errors with custom `toString()` method for formatting

### Custom Rules

All YFM rules follow the markdownlint `Rule` interface:

```typescript
export const yfmXXX: Rule = {
  names: ['YFMXXX', 'alias-name'],
  description: 'Rule description',
  tags: ['category'],
  parser: 'markdownit',
  function: function YFMXXX(params, onError) {
    // Rule implementation
  },
};
```

**Rule Structure**:

- `names` — rule identifiers (primary name and aliases)
- `description` — human-readable description
- `tags` — categories (e.g., 'links', 'term', 'table', 'tab')
- `parser` — always 'markdownit' for YFM rules
- `function` — rule implementation that receives `params` and `onError` callback

**How Rules Work**:

1. Rules receive `params` object with:
   - `config` — rule-specific configuration (may be undefined if rule is disabled)
   - `parsers.markdownit.tokens` — array of markdown-it tokens (not micromark tokens)
   - `lines` — array of file lines
2. Rules check `if (!config) return;` to skip if disabled
3. Rules iterate through markdown-it tokens and call `onError()` when violations are found
4. Some rules use special tokens (e.g., `__yfm_lint` tokens) with attributes set by plugins
5. Rules can access plugin-specific data via token attributes (e.g., `token.attrGet('YFM003')`)
6. **Important**: All tokens are markdown-it tokens, not micromark tokens. Rules must use markdown-it token API.

### Integration with Transform Plugins

YFM rules work with plugins from `@diplodoc/transform`:

- **Term Plugin**: Creates `dfn_open`/`dfn_close` tokens for term definitions
  - Used by YFM006 (duplicated terms), YFM007 (undefined terms), YFM008 (nested terms), YFM009 (term placement)
- **Table Plugin**: Creates `__yfm_lint` tokens with attributes for table validation
  - Used by YFM004 (table not closed)
- **Tab Plugin**: Creates `__yfm_lint` tokens for tab validation
  - Used by YFM005 (tab list not closed)
- **Link Plugin**: Sets attributes on link tokens for link validation
  - Used by YFM002 (no header found), YFM003 (unreachable link)

**Plugin Communication**:

- Plugins set `isLintRun = true` in `pluginOptions` to enable lint-specific behavior
- Plugins create special tokens or set attributes on tokens
- Rules read these tokens/attributes to perform validation
- This allows rules to validate YFM-specific constructs that standard markdownlint cannot handle

### Source Map Support

`@diplodoc/liquid` generates source maps when processing Liquid templates. These source maps are used by `yfmlint` to report errors on original line numbers after template processing.

**How it works**:

1. `liquid` processes YFM files with Liquid templates
2. `liquid` generates source maps mapping output lines to source lines
3. `yfmlint` receives processed content
4. Errors are reported with line numbers from source maps (if available)
5. This ensures errors point to the correct lines in original source files

**Note**: Source map integration is handled by the caller (e.g., `@diplodoc/cli`), not directly by `yfmlint`.

## Configuration

### Default Configuration

Default configuration is defined in `src/config.ts`:

```typescript
export default {
  default: false, // All rules disabled by default
  YFM001: {level: LogLevels.WARN, maximum: 100},
  YFM002: LogLevels.WARN,
  YFM003: LogLevels.ERROR,
  // ... other rules
};
```

### Custom Configuration

Configuration can be customized via:

1. **Programmatic API**: Pass `lintConfig` in options
2. **Configuration File**: `.yfmlint` file (handled by `@diplodoc/cli`)

**Configuration Format**:

```typescript
type RawLintConfig = {
  default?: boolean;
} & {
  [ruleName: string]: LogLevels | boolean | Partial<RuleConfig>;
};
```

**Log Levels**:

- `LogLevels.ERROR` — error level
- `LogLevels.WARN` — warning level
- `LogLevels.INFO` — info level
- `LogLevels.DISABLED` — rule disabled
- `false` — rule disabled (shorthand)

**Rule-Specific Configuration**:

Some rules accept additional parameters:

- `YFM001`: `{ level: LogLevels.WARN, maximum: 100 }` — maximum inline code length

### Configuration Normalization

The `normalizeConfig` function merges multiple configuration objects:

1. Converts boolean values to log level objects
2. Converts string log levels to objects
3. Merges objects using lodash `merge`
4. Simplifies configuration (converts disabled rules to `false`)

## YFM Rules Reference

### YFM001 - Inline code line length

- **Tags**: `line_length`
- **Aliases**: `inline-code-length`
- **Parameters**: `maximum` (default: 100)
- **Description**: Checks that inline code spans don't exceed maximum length

### YFM002 - No header found for link

- **Tags**: `links`
- **Aliases**: `no-header-found-for-link`
- **Description**: Validates that links to headers reference existing headers in target files
- **Requires**: Link validation plugin from `@diplodoc/transform`

### YFM003 - Unreachable link

- **Tags**: `links`
- **Aliases**: `unreachable-link`
- **Description**: Validates that linked files exist and are accessible
- **Reasons**: `file-not-found`, `missing-in-toc`, `missing-in-toc-and-file-not-found`
- **Requires**: Link validation plugin from `@diplodoc/transform`

### YFM004 - Table not closed

- **Tags**: `table`
- **Aliases**: `table-not-closed`
- **Description**: Validates that YFM tables have proper closing tokens
- **Requires**: Table plugin from `@diplodoc/transform`

### YFM005 - Tab list not closed

- **Tags**: `tab`
- **Aliases**: `tab-list-not-closed`
- **Description**: Validates that YFM tab lists have proper closing tokens
- **Requires**: Tab plugin from `@diplodoc/transform`

### YFM006 - Term definition duplicated

- **Tags**: `term`
- **Aliases**: `term-definition-duplicated`
- **Description**: Detects duplicate term definitions
- **Requires**: Term plugin from `@diplodoc/transform`

### YFM007 - Term used without definition

- **Tags**: `term`
- **Aliases**: `term-used-without-definition`
- **Description**: Validates that all used terms are defined
- **Requires**: Term plugin from `@diplodoc/transform`

### YFM008 - Term inside definition not allowed

- **Tags**: `term`
- **Aliases**: `term-inside-definition-not-allowed`
- **Description**: Validates that terms are not used inside their own definitions
- **Requires**: Term plugin from `@diplodoc/transform`

### YFM009 - Term definition not at end of file

- **Tags**: `term`
- **Aliases**: `no-term-definition-in-content`
- **Description**: Validates that term definitions are placed at the end of the file
- **Requires**: Term plugin from `@diplodoc/transform`
- **Token Types**: Uses `dfn_open`/`dfn_close` tokens (not `template_open`/`template_close`)

### YFM010 - Autotitle anchor missed

- **Tags**: `autotitle`
- **Aliases**: `autotitle-anchor-missed`
- **Description**: Validates that autotitle anchors are present when needed

### YFM011 - Max SVG size

- **Tags**: `svg`
- **Aliases**: `max-svg-size`
- **Description**: Validates that SVG files don't exceed maximum size

## Testing

The package uses Vitest for testing with snapshot testing:

### Test Structure

- `test/yfm001.test.ts` — tests for inline code length rule
- `test/yfm004.test.ts` — tests for table validation
- `test/yfm009.test.ts` — tests for term placement validation
- `test/__snapshots__/` — test snapshots
- `test/utils.ts` — test utilities (e.g., `formatErrors`)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Results**: Tests use snapshot testing to ensure rule output matches expected format.

## Development Workflow

### Adding a New Rule

1. Create rule file in `src/rules/yfmXXX.ts`
2. Follow the `Rule` interface pattern
3. Export from `src/rules/index.ts`
4. Add default configuration in `src/config.ts`
5. Write tests in `test/yfmXXX.test.ts`
6. Update README.md with rule documentation

### Modifying Existing Rules

1. Update rule implementation in `src/rules/yfmXXX.ts`
2. Update tests if behavior changes
3. Update snapshots if error messages change: `npm test -- -u`
4. Update README.md if rule description changes

### Updating Dependencies

1. Update dependency versions in `package.json`
2. Test that linting still works with new versions
3. Run `npm test` to verify
4. Regenerate `package-lock.json` for standalone mode: `npm i --no-workspaces --package-lock-only`
5. Update version in `package.json`

## Important Notes

1. **Markdownlint Fork**: This package uses a custom fork of markdownlint (`github:diplodoc-platform/markdownlint#no-parse-micromark`). This fork ensures markdown-it parser support. Do not update to standard markdownlint without checking compatibility.

2. **Markdown-it Token Stream**: All rules work with markdown-it token stream (not micromark). This is a fundamental architectural decision that enables integration with markdown-it plugins from `@diplodoc/transform`. When writing or modifying rules, always use markdown-it token API.

3. **Plugin Integration**: Rules depend on plugins from `@diplodoc/transform` to create special tokens. Ensure plugins are passed when using rules that require them.

4. **Token Types**: Some rules use specific token types (e.g., `dfn_open`/`dfn_close` for terms, `__yfm_lint` for custom validation). Be careful when modifying rule implementations. All tokens are markdown-it tokens.

5. **Source Maps**: Source map integration is handled by callers (e.g., `@diplodoc/cli`), not by `yfmlint` itself.

6. **Configuration Merging**: The `normalizeConfig` function handles complex configuration merging. Understand its behavior before modifying.

7. **Standalone Compatibility**: This package must work both in metapackage and standalone modes. Always test both scenarios.

8. **Used by CLI**: This package is critical for `@diplodoc/cli` build process. Breaking changes may affect documentation builds.

9. **Type Safety**: The package uses strict TypeScript typing. `MarkdownItPlugin` type is used instead of `Function` for better type safety. Helper functions in `rules/helpers.ts` use proper TypeScript types (`TokenWithAttrs`, `RuleOnError`, etc.).

10. **Code Reuse**: Common patterns for finding tokens are extracted into helper functions. When adding new rules, check if existing helpers can be used before duplicating code.

## Additional Resources

- `README.md` — main documentation
- `CONTRIBUTING.md` — contributor guide
- `CHANGELOG.md` — change history
- Metapackage `.agents/` — platform-wide agent documentation
