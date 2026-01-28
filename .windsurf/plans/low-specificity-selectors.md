---
description: Add optional :where() wrapper to lower selector specificity
---

Add an optional parameter to wrap generated selectors in `:where()` pseudo-class, reducing specificity to 0,0,0 for easier overriding.

## Context

Currently, the plugin generates two types of selectors:

1. **Regular class selectors**: `.gap-xs` → specificity (0,1,0)
2. **Attribute selectors**: `[data-size="6"]` or `.heading[data-size="6"]` → specificity (0,1,0) or (0,2,0)

The `:where()` pseudo-class allows wrapping selectors to reduce their specificity to 0, making them easier to override. For example:

- `:where(.gap-xs)` → specificity (0,0,0)
- `:where([data-size="6"])` → specificity (0,0,0)
- `:where(.heading[data-size="6"])` → specificity (0,0,0)

## Implementation Plan

### 1. Add `lowSpecificity` parameter to `parseUtilityParams`

**Location**: `@/Users/kurt/Websites/postcss-ruler/index.js:198-248`

Add a new boolean parameter `lowSpecificity` to the utility params object:

- Default value: `null` (inherits from config or defaults to `false`)
- Parse from `@ruler utility()` parameters
- Store in `utilityParams.lowSpecificity`

### 2. Add `lowSpecificity` to plugin config defaults

**Location**: `@/Users/kurt/Websites/postcss-ruler/index.js:7-12`

Add `lowSpecificity: false` to the `DEFAULTS` object to allow global configuration.

### 3. Update selector generation logic in `processUtilityAtRule`

**Location**: `@/Users/kurt/Websites/postcss-ruler/index.js:364-388`

Modify the selector generation to conditionally wrap in `:where()`:

**For regular class mode** (lines 376-378):

```javascript
ruleSelector = `${utilityParams.selector}-${item.label}`;
// Becomes:
ruleSelector = utilityParams.lowSpecificity
  ? `:where(${utilityParams.selector}-${item.label})`
  : `${utilityParams.selector}-${item.label}`;
```

**For attribute mode** (lines 368-373):

```javascript
const attrSelector = `[${utilityParams.attribute}="${item.label}"]`;
ruleSelector = utilityParams.selector
  ? `${utilityParams.selector}${attrSelector}`
  : attrSelector;
// Becomes:
const attrSelector = `[${utilityParams.attribute}="${item.label}"]`;
const baseSelector = utilityParams.selector
  ? `${utilityParams.selector}${attrSelector}`
  : attrSelector;
ruleSelector = utilityParams.lowSpecificity
  ? `:where(${baseSelector})`
  : baseSelector;
```

### 4. Handle `lowSpecificity` parameter resolution

**Location**: After parsing in `processUtilityAtRule` (around line 310)

Resolve the final `lowSpecificity` value:

```javascript
// After parseUtilityParams call
if (utilityParams.lowSpecificity === null) {
  utilityParams.lowSpecificity = config.lowSpecificity;
}
```

### 5. Add comprehensive tests

**Location**: `@/Users/kurt/Websites/postcss-ruler/index.test.js`

Add test cases for:

- Regular selector with `lowSpecificity: true` → `:where(.gap-xs)`
- Attribute selector with `lowSpecificity: true` → `:where([data-size="xs"])`
- Combined selector + attribute with `lowSpecificity: true` → `:where(.heading[data-size="xs"])`
- Nested selectors with `&` → `:where(&.space-xs)`
- Multiple class selectors → `:where(.container.space-xs)`
- Default behavior (no parameter) → normal selectors without `:where()`
- Global config `lowSpecificity: true` affecting all utilities

### 6. Update documentation

**Location**: `@/Users/kurt/Websites/postcss-ruler/README.md`

Add documentation for:

- Plugin config option `lowSpecificity`
- Utility parameter `lowSpecificity`
- Examples showing specificity differences
- Use cases (design system utilities that should be easily overridable)

## Example Usage

```css
/* Global config */
// postcss.config.js
module.exports = {
  plugins: {
    "postcss-ruler": {
      lowSpecificity: true  // All utilities use :where() by default
    }
  }
}

/* Per-utility override */
@ruler utility({
  selector: '.gap',
  property: 'gap',
  scale: 'space',
  lowSpecificity: true
});

/* Generates: */
:where(.gap-xs) { gap: clamp(...); }
:where(.gap-sm) { gap: clamp(...); }

/* With attribute mode: */
@ruler utility({
  attribute: 'data-size',
  property: 'font-size',
  scale: 'size',
  lowSpecificity: true
});

/* Generates: */
:where([data-size="xs"]) { font-size: var(--size-xs); }
:where([data-size="sm"]) { font-size: var(--size-sm); }
```

## Edge Cases to Consider

1. **Nested selectors with `&`**: Ensure `:where()` wraps the entire final selector
2. **Parent context selectors**: `.container &` becomes `.container :where(&-xs)` (only wrap the child part)
3. **Multiple properties**: Works the same (only affects selector, not properties)
4. **Cross-pairs**: Works identically (e.g., `:where(.gap-xs-lg)`)

## Implementation Details

### Parent Context Handling

For selectors containing `&`, we need to intelligently wrap only the generated part:

- `.container &` + `-xs` → `.container :where(&-xs)`
- `&.active` + `-sm` → `:where(&.active-sm)` (entire selector wrapped since & is at start)

Logic: If selector ends with `&`, insert `:where()` after it. Otherwise, wrap the entire selector.

### Configuration Defaults

- **Parameter name**: `lowSpecificity`
- **Default value**: `false` (maintains current behavior, opt-in for zero specificity)
- **Can be overridden**: Both globally (plugin config) and per-utility
