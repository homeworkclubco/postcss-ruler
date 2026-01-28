const postcss = require("postcss");
const { equal } = require("node:assert");
const { test } = require("node:test");

const plugin = require("./");

async function run(input, output, opts = {}) {
  let result = await postcss([plugin(opts)]).process(input, {
    from: undefined,
  });
  equal(result.css, output);
  equal(result.warnings().length, 0);
}

// Test basic utility class generation with CSS custom property
test("generates utility classes with CSS custom property", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.stack-space',
      property: '--stack-space',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    .stack-space-xs {
    --stack-space: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    .stack-space-sm {
    --stack-space: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test utility generation with regular CSS property
test("generates utility classes with regular CSS property", async () => {
  await run(
    `@ruler scale({
      prefix: 'size',
      pairs: {
        "sm": [100, 200],
        "md": [200, 400]
      }
    });
    @ruler utility({
      selector: '.w',
      property: 'width',
      scale: 'size'
    });`,
    `--size-sm: clamp(6.25rem, 6.9444vw + 4.8611rem, 12.5rem);
--size-md: clamp(12.5rem, 13.8889vw + 9.7222rem, 25rem);
    .w-sm {
    width: clamp(6.25rem, 6.9444vw + 4.8611rem, 12.5rem)
}
    .w-md {
    width: clamp(12.5rem, 13.8889vw + 9.7222rem, 25rem)
}`,
    {},
  );
});

// Test utility generation with multiple properties
test("generates utility classes with multiple properties", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.p-block',
      property: ["padding-top", "padding-bottom"],
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    .p-block-xs {
    padding-top: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    padding-bottom: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    {},
  );
});

// Test utility with generateAllCrossPairs enabled on scale
test("generates utility classes including cross-pairs when scale has them", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      generateAllCrossPairs: true,
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.gap',
      property: 'gap',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
--space-xs-sm: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem);
    .gap-xs {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    .gap-sm {
    gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}
    .gap-xs-sm {
    gap: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem)
}`,
    {},
  );
});

// Test utility with generateAllCrossPairs: false to exclude cross-pairs
test("excludes cross-pairs when generateAllCrossPairs is false", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      generateAllCrossPairs: true,
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.gap',
      property: 'gap',
      scale: 'space',
      generateAllCrossPairs: false
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
--space-xs-sm: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem);
    .gap-xs {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    .gap-sm {
    gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test error when scale doesn't exist
test("throws error when scale does not exist", async () => {
  try {
    await run(
      `@ruler utility({
        selector: '.gap',
        property: 'gap',
        scale: 'nonexistent'
      });`,
      "",
      {},
    );
    throw new Error("Should have thrown an error");
  } catch (err) {
    equal(
      err.message.includes('Scale "nonexistent" not found'),
      true,
      "Should throw error about missing scale",
    );
  }
});

// Test error when required parameters are missing
test("throws error when selector parameter is missing", async () => {
  try {
    await run(
      `@ruler scale({
        prefix: 'space',
        pairs: { "xs": [8, 16] }
      });
      @ruler utility({
        property: 'gap',
        scale: 'space'
      });`,
      "",
      {},
    );
    throw new Error("Should have thrown an error");
  } catch (err) {
    equal(
      err.message.includes(
        'requires either "selector" or "attribute" parameter',
      ),
      true,
      "Should throw error about missing selector or attribute",
    );
  }
});

// Test nested selector with & modifier
test("generates utilities with nested & modifier selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '&.space',
      property: 'gap',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    &.space-xs {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    &.space-sm {
    gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test multiple class selector
test("generates utilities with multiple class selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.container.space',
      property: 'gap',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    .container.space-xs {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    {},
  );
});

// Test ID selector
test("generates utilities with ID selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '#section',
      property: 'padding',
      scale: 'space'
    });`,
    `--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    #section-sm {
    padding: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test element selector
test("generates utilities with element selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "md": [24, 32]
      }
    });
    @ruler utility({
      selector: 'section',
      property: 'margin',
      scale: 'space'
    });`,
    `--space-md: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem);
    section-md {
    margin: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem)
}`,
    {},
  );
});

// Test parent context selector
test("generates utilities with parent context selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.container &',
      property: 'gap',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    .container &-xs {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    {},
  );
});

test("inline function with equal min/max outputs static rem", async () => {
  await run(
    `.element {
  font-size: ruler.fluid(20, 20);
  padding: ruler.fluid(16, 16);
}`,
    `.element {
  font-size: 1.25rem;
  padding: 1rem;
}`,
    {},
  );
});

test("scale generation with equal min/max outputs static rem", async () => {
  await run(
    `@ruler scale({
  prefix: 'size',
  pairs: {
    "static": [16, 16],
    "fluid": [16, 24]
  }
});`,
    `--size-static: 1rem;
--size-fluid: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);`,
    {},
  );
});

test("utility classes with static values output static rem", async () => {
  await run(
    `@ruler scale({
  prefix: 'gap',
  pairs: {
    "fixed": [24, 24],
    "fluid": [24, 32]
  }
});
@ruler utility({
  selector: '.gap',
  property: 'gap',
  scale: 'gap'
});`,
    `--gap-fixed: 1.5rem;
--gap-fluid: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem);
.gap-fixed {
    gap: 1.5rem
}
.gap-fluid {
    gap: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem)
}`,
    {},
  );
});

test("throws error when min > max", async () => {
  let error;
  try {
    await run(
      `.element {
  font-size: ruler.fluid(24, 16);
}`,
      "",
      {},
    );
  } catch (e) {
    error = e;
  }
  equal(error.message.includes("min (24) must be less than max (16)"), true);
});

test("handles mixed static and fluid values in same declaration", async () => {
  await run(
    `.element {
  margin: ruler.fluid(16, 16) ruler.fluid(16, 24);
}`,
    `.element {
  margin: 1rem clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
}`,
    {},
  );
});

// Test data-attribute selector mode
test("generates utilities with data-attribute selectors", async () => {
  await run(
    `@ruler scale({
      prefix: 'size',
      pairs: {
        "xs": [16, 20],
        "sm": [20, 24],
        "md": [24, 32]
      }
    });
    @ruler utility({
      selector: '.heading',
      attribute: 'data-size',
      property: 'font-size',
      scale: 'size'
    });`,
    `--size-xs: clamp(1rem, 0.2778vw + 0.9444rem, 1.25rem);
--size-sm: clamp(1.25rem, 0.2778vw + 1.1944rem, 1.5rem);
--size-md: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem);
    .heading[data-size="xs"] {
    font-size: var(--size-xs)
}
    .heading[data-size="sm"] {
    font-size: var(--size-sm)
}
    .heading[data-size="md"] {
    font-size: var(--size-md)
}`,
    {},
  );
});

// Test data-attribute with empty selector
test("generates standalone attribute selectors with empty selector", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '',
      attribute: 'data-gap',
      property: 'gap',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    [data-gap="xs"] {
    gap: var(--space-xs)
}
    [data-gap="sm"] {
    gap: var(--space-sm)
}`,
    {},
  );
});

// Test data-attribute with cross-pairs
test("generates attribute selectors with cross-pairs preserving hyphens", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      generateAllCrossPairs: true,
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.box',
      attribute: 'data-space',
      property: 'padding',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
--space-xs-sm: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem);
    .box[data-space="xs"] {
    padding: var(--space-xs)
}
    .box[data-space="sm"] {
    padding: var(--space-sm)
}
    .box[data-space="xs-sm"] {
    padding: var(--space-xs-sm)
}`,
    {},
  );
});

// Test validation: empty attribute string
test("throws error when attribute parameter is empty string", async () => {
  try {
    await run(
      `@ruler scale({
        prefix: 'space',
        pairs: { "xs": [8, 16] }
      });
      @ruler utility({
        attribute: '',
        property: 'gap',
        scale: 'space'
      });`,
      "",
      {},
    );
    throw new Error("Should have thrown an error");
  } catch (err) {
    equal(
      err.message.includes("attribute parameter cannot be empty"),
      true,
      "Should throw error about empty attribute",
    );
  }
});

// Test validation: invalid attribute characters
test("throws error when attribute parameter contains invalid characters", async () => {
  try {
    await run(
      `@ruler scale({
        prefix: 'space',
        pairs: { "xs": [8, 16] }
      });
      @ruler utility({
        attribute: 'data size',
        property: 'gap',
        scale: 'space'
      });`,
      "",
      {},
    );
    throw new Error("Should have thrown an error");
  } catch (err) {
    equal(
      err.message.includes(
        "must contain only letters, numbers, hyphens, and underscores",
      ),
      true,
      "Should throw error about invalid attribute characters",
    );
  }
});

// Test lowSpecificity with regular class selector
test("generates utilities with :where() wrapper when lowSpecificity is true", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.gap',
      property: 'gap',
      scale: 'space',
      lowSpecificity: true
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    :where(.gap-xs) {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    :where(.gap-sm) {
    gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test lowSpecificity with attribute selector
test("generates attribute utilities with :where() wrapper when lowSpecificity is true", async () => {
  await run(
    `@ruler scale({
      prefix: 'size',
      pairs: {
        "xs": [16, 20],
        "sm": [20, 24]
      }
    });
    @ruler utility({
      attribute: 'data-size',
      property: 'font-size',
      scale: 'size',
      lowSpecificity: true
    });`,
    `--size-xs: clamp(1rem, 0.2778vw + 0.9444rem, 1.25rem);
--size-sm: clamp(1.25rem, 0.2778vw + 1.1944rem, 1.5rem);
    :where([data-size="xs"]) {
    font-size: var(--size-xs)
}
    :where([data-size="sm"]) {
    font-size: var(--size-sm)
}`,
    {},
  );
});

// Test lowSpecificity with combined selector and attribute
test("generates combined selector+attribute with :where() wrapper", async () => {
  await run(
    `@ruler scale({
      prefix: 'size',
      pairs: {
        "md": [24, 32]
      }
    });
    @ruler utility({
      selector: '.heading',
      attribute: 'data-size',
      property: 'font-size',
      scale: 'size',
      lowSpecificity: true
    });`,
    `--size-md: clamp(1.5rem, 0.5556vw + 1.3889rem, 2rem);
    :where(.heading[data-size="md"]) {
    font-size: var(--size-md)
}`,
    {},
  );
});

// Test lowSpecificity with parent context selector
test("generates parent context selector with :where() wrapper on child part", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.container &',
      property: 'gap',
      scale: 'space',
      lowSpecificity: true
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    .container :where(&-xs) {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    {},
  );
});

// Test lowSpecificity with nested & selector
test("generates nested & selector with :where() wrapper", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '&.active',
      property: 'padding',
      scale: 'space',
      lowSpecificity: true
    });`,
    `--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
    :where(&.active-sm) {
    padding: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}`,
    {},
  );
});

// Test lowSpecificity from global config
test("applies lowSpecificity from global config", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.m',
      property: 'margin',
      scale: 'space'
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    :where(.m-xs) {
    margin: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    { lowSpecificity: true },
  );
});

// Test lowSpecificity override (global true, utility false)
test("utility lowSpecificity parameter overrides global config", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.p',
      property: 'padding',
      scale: 'space',
      lowSpecificity: false
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    .p-xs {
    padding: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    { lowSpecificity: true },
  );
});

// Test lowSpecificity with cross-pairs
test("generates cross-pairs with :where() wrapper", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      generateAllCrossPairs: true,
      pairs: {
        "xs": [8, 16],
        "sm": [16, 24]
      }
    });
    @ruler utility({
      selector: '.gap',
      property: 'gap',
      scale: 'space',
      lowSpecificity: true
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
--space-sm: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
--space-xs-sm: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem);
    :where(.gap-xs) {
    gap: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}
    :where(.gap-sm) {
    gap: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem)
}
    :where(.gap-xs-sm) {
    gap: clamp(0.5rem, 1.1111vw + 0.2778rem, 1.5rem)
}`,
    {},
  );
});

// Test lowSpecificity with multiple properties
test("generates utilities with :where() and multiple properties", async () => {
  await run(
    `@ruler scale({
      prefix: 'space',
      pairs: {
        "xs": [8, 16]
      }
    });
    @ruler utility({
      selector: '.p-block',
      property: ["padding-top", "padding-bottom"],
      scale: 'space',
      lowSpecificity: true
    });`,
    `--space-xs: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    :where(.p-block-xs) {
    padding-top: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem);
    padding-bottom: clamp(0.5rem, 0.5556vw + 0.3889rem, 1rem)
}`,
    {},
  );
});
