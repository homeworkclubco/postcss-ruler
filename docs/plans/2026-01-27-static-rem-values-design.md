# Static Rem Values Feature Design

**Date:** 2026-01-27
**Version:** 1.2.0

## Overview

Add support for outputting static rem values when min and max values are equal, instead of generating fluid clamp() functions. This works across all plugin modes: scale generation, utility classes, and inline functions.

## Problem Statement

Currently, postcss-ruler throws an error when min >= max. Users want the ability to define static values alongside fluid scales, outputting simple rem values (e.g., `1rem`) instead of `clamp()` functions when min equals max.

## Solution

### Core Behavior Change

Modify the `calculateClamp` function to detect when `minSize === maxSize` and return a simple rem value:

```javascript
const calculateClamp = ({ minSize, maxSize, minWidth, maxWidth }) => {
    // New: Allow equal values - just return rem
    if (minSize === maxSize) {
        return pxToRem(minSize);
    }

    // Existing: Validate min < max
    validateMinMax(minSize, maxSize, 'size');
    validateMinMax(minWidth, maxWidth, 'width');

    // Existing: Calculate fluid clamp
    const slope = (maxSize - minSize) / (maxWidth - minWidth);
    const intersect = -minWidth * slope + minSize;
    return `clamp(${pxToRem(minSize)}, ${(slope * 100).toFixed(4)}vw + ${pxToRem(intersect)}, ${pxToRem(maxSize)})`;
};
```

### Validation Rules

- **min === max:** Output static rem value (NEW)
- **min < max:** Output fluid clamp() function (EXISTING)
- **min > max:** Throw error (EXISTING)

### Impact

This single change automatically enables static rem values across all three plugin modes:

1. **Scale generation:** `@ruler scale({ pairs: { "static": [16, 16] } })` → `--space-static: 1rem`
2. **Utility classes:** Classes using scales with static values get static rem
3. **Inline functions:** `ruler.fluid(20, 20)` → `1.25rem`

## Testing Strategy

Add test cases to `index.test.js`:

1. Scale generation with equal values
2. Inline function with equal values
3. Utility classes with static values
4. Edge case validation (min > max still errors)

Follow existing test pattern using `run(input, output, opts)` helper.

## Deployment Plan

1. Update `package.json` version from `1.1.0` to `1.2.0` (minor bump)
2. Run tests: `npm test`
3. Commit: "feat: support static rem values when min equals max"
4. Create git tag: `v1.2.0`
5. Push commit and tag to GitHub
6. Publish: `npm publish`
7. Optional: Update README.md with static rem examples

## Version Rationale

**Minor version bump (1.1.0 → 1.2.0):** This is a new feature that's fully backwards compatible. Existing code continues to work exactly as before, and the new behavior only activates when users explicitly set min === max.
