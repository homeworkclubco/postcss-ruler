# postcss-ruler

A PostCSS plugin that generates fluid CSS scales and values using the `clamp()` function. Create responsive typography and spacing that scales smoothly between viewport sizes.

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

Or in `.postcssrc`:

```json
{
  "plugins": {
    "postcss-ruler": {
      "minWidth": 320,
      "maxWidth": 1760,
      "generateAllCrossPairs": false
    }
  }
}
```

## Features

### 1. At-Rule Mode: Generate Fluid Scale

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

**Usage in CSS:**

```css
.container {
  padding: var(--space-md);
  gap: var(--space-sm);
}
```

#### Cross Pairs

Enable `generateAllCrossPairs: true` to create additional combinations between all defined pairs:

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

**Generates base pairs plus cross combinations:**

```css
--space-xs: clamp(...);
--space-md: clamp(...);
--space-lg: clamp(...);
--space-xs-md: clamp(0.5rem, 1.3636vw + 0.3636rem, 2rem);
--space-xs-lg: clamp(0.5rem, 2.2727vw + 0.3636rem, 3rem);
--space-md-lg: clamp(1.5rem, 0.9091vw + 1.3636rem, 3rem);
```

### 2. Inline Mode: Fluid Function

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
