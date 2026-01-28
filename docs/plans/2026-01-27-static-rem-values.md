# Static Rem Values Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow postcss-ruler to output static rem values when min and max values are equal

**Architecture:** Modify the `calculateClamp` function to detect when `minSize === maxSize` and return a simple rem value instead of a clamp() function. This change automatically enables the feature across all three plugin modes: scale generation, utility classes, and inline functions.

**Tech Stack:** PostCSS, postcss-value-parser, Node.js test runner

---

## Task 1: Write Failing Tests for Static Rem Values

**Files:**
- Modify: `index.test.js` (add tests at end of file)

### Step 1: Add test for inline function with equal values

Add this test to `index.test.js`:

```javascript
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
```

### Step 2: Add test for scale generation with equal values

Add this test to `index.test.js`:

```javascript
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
```

### Step 3: Add test for utility classes with static values

Add this test to `index.test.js`:

```javascript
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
```

### Step 4: Run tests to verify they fail

Run: `npm run unit`

Expected output: Tests should FAIL with errors about min >= max validation

### Step 5: Commit failing tests

```bash
git add index.test.js
git commit -m "test: add failing tests for static rem values

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Implement Static Rem Feature

**Files:**
- Modify: `index.js:48-58` (the `calculateClamp` function)

### Step 1: Modify calculateClamp to handle equal values

Replace the `calculateClamp` function at line 48 in `index.js`:

```javascript
const calculateClamp = ({ minSize, maxSize, minWidth, maxWidth }) => {
    // New: Allow equal values - just return rem
    if (minSize === maxSize) {
        return pxToRem(minSize);
    }

    validateMinMax(minSize, maxSize, 'size');
    validateMinMax(minWidth, maxWidth, 'width');

    const slope = (maxSize - minSize) / (maxWidth - minWidth);
    const intersect = -minWidth * slope + minSize;

    return `clamp(${pxToRem(minSize)}, ${(slope * 100).toFixed(
        4
    )}vw + ${pxToRem(intersect)}, ${pxToRem(maxSize)})`;
};
```

### Step 2: Run tests to verify they pass

Run: `npm run unit`

Expected output: All tests should PASS

### Step 3: Commit the implementation

```bash
git add index.js
git commit -m "feat: support static rem values when min equals max

When minSize === maxSize, output simple rem value instead of clamp().
This works across all three modes: scale generation, utility classes,
and inline functions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Edge Case Tests

**Files:**
- Modify: `index.test.js` (add tests at end of file)

### Step 1: Add test for min > max validation

Add this test to `index.test.js`:

```javascript
test('throws error when min > max', async () => {
  let error
  try {
    await run(
      `.element {
  font-size: ruler.fluid(24, 16);
}`,
      '',
      {}
    )
  } catch (e) {
    error = e
  }
  equal(error.message.includes('min (24) must be less than max (16)'), true)
})
```

### Step 2: Add test for mixed static and fluid in same declaration

Add this test to `index.test.js`:

```javascript
test('handles mixed static and fluid values in same declaration', async () => {
  await run(
    `.element {
  margin: ruler.fluid(16, 16) ruler.fluid(16, 24);
}`,
    `.element {
  margin: 1rem clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
}`,
    {}
  )
})
```

### Step 3: Run tests to verify they pass

Run: `npm run unit`

Expected output: All tests should PASS

### Step 4: Commit edge case tests

```bash
git add index.test.js
git commit -m "test: add edge case tests for static rem values

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Documentation

**Files:**
- Modify: `README.md` (add new section after line 241)

### Step 1: Add static values section to README

Insert this section after line 241 in `README.md` (after the inline function parameter table):

```markdown

### Static Values

When min and max values are equal, postcss-ruler outputs a simple rem value instead of a clamp() function. This works in all three modes:

**Inline function:**
```css
.element {
  font-size: ruler.fluid(20, 20);
}
```

**Generates:**
```css
.element {
  font-size: 1.25rem;
}
```

**Scale generation:**
```css
@ruler scale({
  prefix: 'size',
  pairs: {
    "static": [16, 16],
    "fluid": [16, 24]
  }
});
```

**Generates:**
```css
--size-static: 1rem;
--size-fluid: clamp(1rem, 0.5556vw + 0.8889rem, 1.5rem);
```

**Use case:** Mix static and fluid values in the same scale for consistency. Define your base unit as a static value and let other sizes scale fluidly from it.
```

### Step 2: Run tests to ensure docs didn't break anything

Run: `npm test`

Expected output: All tests and linting should PASS

### Step 3: Commit documentation

```bash
git add README.md
git commit -m "docs: add static rem values feature to README

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Version Bump and Publish

**Files:**
- Modify: `package.json:3` (version field)

### Step 1: Update version in package.json

Change line 3 in `package.json` from:
```json
  "version": "1.1.0",
```

To:
```json
  "version": "1.2.0",
```

### Step 2: Run final test suite

Run: `npm test`

Expected output: All tests and linting should PASS

### Step 3: Commit version bump

```bash
git add package.json
git commit -m "chore: bump version to 1.2.0

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 4: Create git tag

Run: `git tag v1.2.0`

Expected output: No output (success)

### Step 5: Push to GitHub

Run: `git push && git push --tags`

Expected output: Push should succeed with tag pushed

### Step 6: Verify npm authentication

Run: `npm whoami`

Expected output: Should display your npm username. If not logged in, run `npm login` first.

### Step 7: Publish to npm

Run: `npm publish`

Expected output: Package should publish successfully with version 1.2.0

### Step 8: Verify publication

Run: `npm info postcss-ruler version`

Expected output: Should show `1.2.0`

---

## Verification Checklist

After completing all tasks, verify:

- [ ] All tests pass (`npm test`)
- [ ] Version is 1.2.0 in package.json
- [ ] Git tag v1.2.0 exists
- [ ] Package is published to npm at version 1.2.0
- [ ] README documents the new static rem feature
- [ ] All commits are pushed to GitHub

## Rollback Plan

If issues occur after publishing:

1. Unpublish version if critical bug: `npm unpublish postcss-ruler@1.2.0` (only within 72 hours)
2. Or publish a patch fix as 1.2.1 with the fix

## Notes

- The static rem feature is fully backwards compatible
- Existing code continues to work exactly as before
- The new behavior only activates when users set min === max
- All three plugin modes (scale, utility, inline) automatically support this feature through the shared `calculateClamp` function
