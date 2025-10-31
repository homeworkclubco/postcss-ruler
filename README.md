# postcss-ruler

A PostCSS plugin that generates fluid CSS scales and values using the `clamp()` function. Create responsive typography and spacing that scales smoothly between viewport sizes.

**Inspired by [Utopia](https://utopia.fyi/)**, but designed for real-world design collaboration. Instead of strict programmatic scales, postcss-ruler lets you define exact min and max pixel values for each size. This gives you the flexibility to match design specs from tools like Figma while still getting fluid scaling behavior.

## Why postcss-ruler?

Working with design teams often means dealing with sizes that don't follow perfect mathematical ratios. A designer might spec `16px → 24px` for one size and `32px → 56px` for another based on visual harmony rather than a type scale.

postcss-ruler embraces this reality. You get:
- **Fine-tuned control**: Set exact min and max values per size
- **Design tool compatibility**: Match your Figma specs precisely
- **Fluid behavior**: Smooth scaling between breakpoints via `clamp()`
- **Cross pairs**: Generate spacing between any two sizes (explained below)

## Installation
```bash
npm install postcss-ruler
```

## Usage

Add the plugin to your PostCSS configuration:
```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-ruler': {
      minWidth: 320,    // Default minimum viewport width
      maxWidth: 1760,   // Default maximum viewport width
      generateAllCrossPairs: false
    }
  }
}
```

## Features

### 1. Scale Generation: Create Fluid Scales

Create multiple CSS custom properties from named size pairs:
```css
@ruler scale({
  minWidth: 320,
  maxWidth: 1760,
  prefix: 'space',
  generateAllCrossPairs: false,
  pairs: {
    "xs": [8, 16],
    "sm": [16, 24],
    "md": [24, 32],
    "lg": [32, 48],
    "xl": [48, 64]
  }
});
```

**Generates:**
```css
--space-xs: clamp(0.5rem, 0.4545vw + 0.3636rem, 1rem);
--space-sm: clamp(1rem, 0.4545vw + 0.8636rem, 1.5rem);
--space-md: clamp(1.5rem, 0.4545vw + 1.3636rem, 2rem);
--space-lg: clamp(2rem, 0.9091vw + 1.7273rem, 3rem);
--space-xl: clamp(3rem, 0.9091vw + 2.7273rem, 4rem);
```

### Understanding Cross Pairs

Cross pairs create fluid values between any two sizes in your scale. This is useful for spacing that needs to span multiple steps.

For example, if you have `xs: [8, 16]` and `lg: [32, 48]`, a cross pair `xs-lg` would scale from `8px → 48px`. This gives you a larger range of motion than using `xs` or `lg` alone.

**Without cross pairs**, you only get the sizes you explicitly define.

**With `generateAllCrossPairs: true`**, you get every possible combination:
```css
@ruler scale({
  prefix: 'space',
  generateAllCrossPairs: true,
  pairs: {
    "xs": [8, 16],
    "md": [24, 32],
    "lg": [32, 48]
  }
});
```

**Generates:**
```css
/* Your defined pairs */
--space-xs: clamp(0.5rem, ...);
--space-md: clamp(1.5rem, ...);
--space-lg: clamp(2rem, ...);

/* All cross combinations */
--space-xs-md: clamp(0.5rem, 1.3636vw + 0.3636rem, 2rem);    /* 8px → 32px */
--space-xs-lg: clamp(0.5rem, 2.2727vw + 0.3636rem, 3rem);    /* 8px → 48px */
--space-md-lg: clamp(1.5rem, 0.9091vw + 1.3636rem, 3rem);    /* 24px → 48px */
```

**Use case**: Section padding that needs more dramatic scaling than your base sizes allow.
```css
.hero {
  padding-block: var(--space-md-xl); /* Scales across a wider range */
}
```

### 2. Utility Class Generation: Auto-Generate Utility Classes

Generate utility classes from your defined scales with complete selector flexibility:

```css
@ruler scale({
  prefix: 'space',
  pairs: {
    "xs": [8, 16],
    "sm": [16, 24],
    "md": [24, 32]
  }
});

/* Basic class selector */
@ruler utility({
  selector: '.gap',
  property: 'gap',
  scale: 'space'
});

/* Nested selector with & (for PostCSS nesting) */
@ruler utility({
  selector: '&.active',
  property: 'padding',
  scale: 'space'
});

/* Multiple properties */
@ruler utility({
  selector: '.p-block',
  property: ['padding-top', 'padding-bottom'],
  scale: 'space'
});
```

**Generates:**
```css
--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
--space-md: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem);

.gap-xs { gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem) }
.gap-sm { gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem) }
.gap-md { gap: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem) }

&.active-xs { padding: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem) }
&.active-sm { padding: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem) }
&.active-md { padding: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem) }

.p-block-xs {
  padding-top: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
  padding-bottom: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
/* ... */
```

**Supported selector patterns:**
- **Class selectors**: `.gap` → `.gap-xs`, `.gap-sm`, `.gap-md`
- **Nested with &**: `&.active` → `&.active-xs`, `&.active-sm` (PostCSS nesting)
- **Multiple classes**: `.container.space` → `.container.space-xs`, etc.
- **ID selectors**: `#section` → `#section-xs`, `#section-sm`
- **Element selectors**: `section` → `section-xs`, `section-sm`
- **Parent context**: `.container &` → `.container &-xs`, etc.

**Utility options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `selector` | string | Yes | Any valid CSS selector pattern (e.g., `.gap`, `&.active`, `#section`) |
| `property` | string or array | Yes | CSS property name(s) to apply the scale values to |
| `scale` | string | Yes | Name of a previously defined scale (the `prefix` value) |
| `generateAllCrossPairs` | boolean | No | Include/exclude cross-pairs (overrides scale default) |

### 3. Inline Mode: Fluid Function

Convert individual values directly to `clamp()` functions:
```css
.element {
  /* Uses default minWidth/maxWidth from config */
  font-size: ruler.fluid(16, 24);

  /* Custom viewport widths */
  padding: ruler.fluid(12, 20, 320, 1200);

  /* Multiple fluid values */
  margin: ruler.fluid(8, 16) ruler.fluid(16, 32);
}
```

**Generates:**
```css
.element {
  font-size: clamp(1rem, 0.4545vw + 0.8636rem, 1.5rem);
  padding: clamp(0.75rem, 0.9091vw + 0.4773rem, 1.25rem);
  margin: clamp(0.5rem, 0.4545vw + 0.3636rem, 1rem) clamp(1rem, 0.9091vw + 0.7273rem, 2rem);
}
```

## Configuration Options

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minWidth` | number | `320` | Default minimum viewport width in pixels |
| `maxWidth` | number | `1760` | Default maximum viewport width in pixels |
| `generateAllCrossPairs` | boolean | `false` | Generate cross-combinations in scale mode |

### At-Rule Options

All options can be overridden per `@ruler scale()` declaration:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minWidth` | number | `320` | Minimum viewport width for this scale |
| `maxWidth` | number | `1760` | Maximum viewport width for this scale |
| `prefix` | string | `"space"` | Prefix for generated CSS custom properties |
| `generateAllCrossPairs` | boolean | `false` | Generate cross-combinations for this scale |
| `pairs` | object | required | Size pairs as `"name": [min, max]` |

### Inline Function Syntax

```
ruler.fluid(minSize, maxSize[, minWidth, maxWidth])
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `minSize` | number | Yes | Minimum size in pixels |
| `maxSize` | number | Yes | Maximum size in pixels |
| `minWidth` | number | No | Minimum viewport width (uses config default) |
| `maxWidth` | number | No | Maximum viewport width (uses config default) |

### Utility Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selector` | string | required | Any valid CSS selector pattern (e.g., `.gap`, `&.active`, `#section`) |
| `property` | string or array | required | CSS property name(s) to apply the scale values to |
| `scale` | string | required | Name of a previously defined scale (the `prefix` value) |
| `generateAllCrossPairs` | boolean | No | Include/exclude cross-pairs (overrides scale default) |

## How It Works

The plugin uses linear interpolation to create fluid values that scale smoothly between viewport sizes:

1. **Converts pixels to rem** (assumes 16px base font size)
2. **Calculates slope**: `(maxSize - minSize) / (maxWidth - minWidth)`
3. **Calculates y-intercept**: `-minWidth × slope + minSize`
4. **Generates clamp**: `clamp(minRem, slopeVw + intersectRem, maxRem)`

### Example Calculation

For `ruler.fluid(16, 24)` with default config (320-1760px):

- Slope: `(24 - 16) / (1760 - 320) = 0.005556`
- Intercept: `-320 × 0.005556 + 16 = 14.222`
- Result: `clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)`

At 320px viewport: `1rem` (16px)
At 1040px viewport: `1.3333rem` (≈21.3px)
At 1760px viewport: `1.5rem` (24px)

## Use Cases

### Utility-First Workflow with Fluid Scales

Generate a complete set of utility classes from your design system:

```css
@ruler scale({
  prefix: 'space',
  generateAllCrossPairs: true,
  pairs: {
    "xs": [8, 16],
    "sm": [12, 20],
    "md": [16, 28],
    "lg": [24, 40],
    "xl": [32, 56]
  }
});

/* Gap utilities */
@ruler utility({
  selector: '.gap',
  property: 'gap',
  scale: 'space'
});

/* Padding utilities */
@ruler utility({
  selector: '.p',
  property: 'padding',
  scale: 'space'
});

/* Margin utilities */
@ruler utility({
  selector: '.m',
  property: 'margin',
  scale: 'space'
});

/* Stack spacing (for flow layout) */
@ruler utility({
  selector: '.stack > * + *',
  property: 'margin-top',
  scale: 'space'
});
```

Use in your HTML:
```html
<section class="p-lg gap-md">
  <div class="stack gap-sm">
    <h2>Heading</h2>
    <p>Content that scales smoothly</p>
  </div>
</section>
```

### Responsive Typography

```css
@ruler scale({
  prefix: 'font',
  pairs: {
    "sm": [14, 16],
    "base": [16, 18],
    "lg": [18, 24],
    "xl": [24, 32],
    "2xl": [32, 48]
  }
});

body {
  font-size: var(--font-base);
}

h1 {
  font-size: var(--font-2xl);
}

h2 {
  font-size: var(--font-xl);
}
```

### Spacing System

```css
@ruler scale({
  prefix: 'space',
  generateAllCrossPairs: true,
  pairs: {
    "2xs": [4, 8],
    "xs": [8, 12],
    "sm": [12, 16],
    "md": [16, 24],
    "lg": [24, 32],
    "xl": [32, 48],
    "2xl": [48, 64]
  }
});

.section {
  padding-block: var(--space-lg);
  padding-inline: var(--space-md);
}

.stack > * + * {
  margin-top: var(--space-sm);
}
```

### One-Off Fluid Values

```css
.hero {
  font-size: ruler.fluid(32, 72);
  padding: ruler.fluid(24, 64);
}

.card {
  border-radius: ruler.fluid(8, 16);
  gap: ruler.fluid(12, 24);
}
```

## Browser Support

The `clamp()` function is supported in all modern browsers:
- Chrome 79+
- Firefox 75+
- Safari 13.1+
- Edge 79+

For older browsers, consider using a fallback:

```css
.element {
  font-size: 16px; /* Fallback */
  font-size: ruler.fluid(16, 24);
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
