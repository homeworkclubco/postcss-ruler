const postcss = require('postcss')
const { equal } = require('node:assert')
const { test } = require('node:test')

const plugin = require('./')

async function run(input, output, opts = {}) {
  let result = await postcss([plugin(opts)]).process(input, { from: undefined })
  equal(result.css, output)
  equal(result.warnings().length, 0)
}

// Test basic utility class generation with CSS custom property
test('generates utility classes with CSS custom property', async () => {
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
    {}
  )
})

// Test utility generation with regular CSS property
test('generates utility classes with regular CSS property', async () => {
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
    {}
  )
})

// Test utility generation with multiple properties
test('generates utility classes with multiple properties', async () => {
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
    {}
  )
})

// Test utility with generateAllCrossPairs enabled on scale
test('generates utility classes including cross-pairs when scale has them', async () => {
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
    {}
  )
})

// Test utility with generateAllCrossPairs: false to exclude cross-pairs
test('excludes cross-pairs when generateAllCrossPairs is false', async () => {
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
    {}
  )
})

// Test error when scale doesn't exist
test('throws error when scale does not exist', async () => {
  try {
    await run(
      `@ruler utility({
        selector: '.gap',
        property: 'gap',
        scale: 'nonexistent'
      });`,
      '',
      {}
    )
    throw new Error('Should have thrown an error')
  } catch (err) {
    equal(
      err.message.includes('Scale "nonexistent" not found'),
      true,
      'Should throw error about missing scale'
    )
  }
})

// Test error when required parameters are missing
test('throws error when selector parameter is missing', async () => {
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
      '',
      {}
    )
    throw new Error('Should have thrown an error')
  } catch (err) {
    equal(
      err.message.includes('requires a "selector" parameter'),
      true,
      'Should throw error about missing selector'
    )
  }
})

// Test nested selector with & modifier
test('generates utilities with nested & modifier selector', async () => {
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
    {}
  )
})

// Test multiple class selector
test('generates utilities with multiple class selector', async () => {
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
    {}
  )
})

// Test ID selector
test('generates utilities with ID selector', async () => {
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
    {}
  )
})

// Test element selector
test('generates utilities with element selector', async () => {
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
    {}
  )
})

// Test parent context selector
test('generates utilities with parent context selector', async () => {
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
    {}
  )
})

test('inline function with equal min/max outputs static rem', async () => {
  await run(
    `.element {
  font-size: ruler.fluid(20, 20);
  padding: ruler.fluid(16, 16);
}`,
    `.element {
  font-size: 1.25rem;
  padding: 1rem;
}`,
    {}
  )
})

test('scale generation with equal min/max outputs static rem', async () => {
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
    {}
  )
})

test('utility classes with static values output static rem', async () => {
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
    {}
  )
})
