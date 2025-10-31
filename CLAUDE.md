# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

postcss-ruler is a PostCSS plugin that generates fluid CSS scales and values using the `clamp()` function. It enables responsive typography and spacing by converting pixel-based min/max pairs into fluid CSS custom properties or inline values.

## Core Architecture

The plugin operates in two modes:

1. **At-rule mode**: `@ruler scale()` - Generates multiple CSS custom properties from named pairs
2. **Inline mode**: `ruler.fluid(minSize, maxSize, minWidth?, maxWidth?)` - Converts inline function calls directly to `clamp()` values

### Key Components

**Main entry point** (`index.js`):
- Exports a PostCSS plugin factory function
- Processes both `@fluid` at-rules and inline `generateScale()` functions
- Configuration: `minWidth` (default: 320), `maxWidth` (default: 1760), `generateAllCrossPairs` (default: false)

**Core calculation** (`calculateClamp` function, index.js:45):
- Uses linear interpolation to compute fluid values
- Formula: `clamp(minRem, slopeVw + intersectRem, maxRem)`
- Converts all pixel values to rem (assuming 16px base)

**At-rule processing** (`processFluidAtRule`, index.js:194):
- Parses `@ruler scale()` parameters using `postcss-value-parser`
- Accepts configuration: `minWidth`, `maxWidth`, `prefix`, `relativeTo`, `generateAllCrossPairs`, and `pairs`
- Generates CSS custom properties in format: `--{prefix}-{label}: clamp(...)`
- When `generateAllCrossPairs: true`, creates additional cross-combinations between all defined pairs

**Declaration processing** (`processFluidDeclaration`, index.js:231):
- Walks declaration values to find `ruler.fluid()` function calls
- Detects pattern: word "ruler", div ".", function "fluid"
- Replaces `ruler.fluid(...)` with calculated `clamp()` value in-place
- Removes "ruler" and "." tokens during replacement
- Note: The dot is parsed as a 'div' (divider) type node by postcss-value-parser

## Development Commands

```bash
# Run unit tests
npm run unit

# Run tests and linting
npm test

# Run only linting
npx eslint .
```

## Testing

Tests use Node's built-in test runner (`node:test`). Test structure:
- Import plugin and PostCSS
- Use `run(input, output, opts)` helper function
- Verify CSS output and check for warnings

The test file (index.test.js) currently has placeholder structure - actual tests need to be written.

## Plugin Usage Patterns

**At-rule syntax**:
```css
@ruler scale({
  minWidth: 320,
  maxWidth: 1760,
  prefix: 'space',
  generateAllCrossPairs: false,
  pairs: {
    "xs": [8, 16],
    "sm": [16, 24],
    "md": [24, 32]
  }
});
```

**Inline function syntax**:
```css
.element {
  font-size: ruler.fluid(16, 24);           /* Uses default widths */
  padding: ruler.fluid(12, 20, 320, 1200); /* Custom widths */
}
```

## Important Implementation Details

- All calculations assume 16px base font size for rem conversion
- The plugin validates that min values are always less than max values
- Uses `postcss-value-parser` for parsing both at-rule params and declaration values
- Error messages are prefixed with `[postcss-ruler]`
- The `generateAllCrossPairs` feature creates combinations like `xs-md`, `xs-lg`, `sm-lg` from defined pairs
- Inline function detection looks for the pattern: word "ruler" + div "." + function "fluid"
- The dot separator is parsed as a 'div' type node by postcss-value-parser, not a 'word' node
