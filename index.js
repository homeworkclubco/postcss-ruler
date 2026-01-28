const CSSValueParser = require("postcss-value-parser");

/**
 * @type {import('postcss').PluginCreator}
 */
module.exports = (opts) => {
  const DEFAULTS = {
    minWidth: 320,
    maxWidth: 1760,
    generateAllCrossPairs: false,
    lowSpecificity: false,
  };
  const config = Object.assign(DEFAULTS, opts);

  // Storage for generated scales
  const scales = {};

  /**
   * Converts pixels to r]em units
   * @param {number} px - Pixel value to convert
   * @returns {string} Rem value as string
   */
  const pxToRem = (px) => `${parseFloat((px / 16).toFixed(4))}rem`;

  /**
   * Validates that min value is less than max value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} context - Context for error message
   * @throws {Error} If min >= max
   */
  const validateMinMax = (min, max, context) => {
    if (min >= max) {
      throw new Error(
        `[postcss-ruler] Invalid ${context}: min (${min}) must be less than max (${max})`,
      );
    }
  };

  /**
   * Calculates a fluid clamp() function
   * @param {Object} params - Calculation parameters
   * @param {number} params.minSize - Minimum size in pixels
   * @param {number} params.maxSize - Maximum size in pixels
   * @param {number} params.minWidth - Minimum viewport width in pixels
   * @param {number} params.maxWidth - Maximum viewport width in pixels
   * @returns {string} CSS clamp() function
   */
  const calculateClamp = ({ minSize, maxSize, minWidth, maxWidth }) => {
    // New: Allow equal values - just return rem
    if (minSize === maxSize) {
      return pxToRem(minSize);
    }

    validateMinMax(minSize, maxSize, "size");
    validateMinMax(minWidth, maxWidth, "width");

    const slope = (maxSize - minSize) / (maxWidth - minWidth);
    const intersect = -minWidth * slope + minSize;

    return `clamp(${pxToRem(minSize)}, ${(slope * 100).toFixed(
      4,
    )}vw + ${pxToRem(intersect)}, ${pxToRem(maxSize)})`;
  };

  /**
   * Generates clamp values from pairs
   * @param {Object} params - Generation parameters
   * @param {Array<{name: string, values: [number, number]}>} params.pairs - Size pairs
   * @param {number} params.minWidth - Minimum viewport width
   * @param {number} params.maxWidth - Maximum viewport width
   * @param {boolean} params.generateAllCrossPairs - Whether to generate cross pairs
   * @returns {Array<{label: string, clamp: string}>} Array of clamp values
   */
  const generateClamps = ({
    pairs,
    minWidth,
    maxWidth,
    generateAllCrossPairs,
  }) => {
    let clampScales = pairs.map(({ name, values: [minSize, maxSize] }) => ({
      label: name,
      clamp: calculateClamp({
        minSize,
        maxSize,
        minWidth,
        maxWidth,
      }),
    }));

    if (generateAllCrossPairs) {
      let crossPairs = [];
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const [smaller, larger] = [pairs[i], pairs[j]].sort(
            (a, b) => a.values[0] - b.values[0],
          );
          crossPairs.push({
            label: `${smaller.name}-${larger.name}`,
            clamp: calculateClamp({
              minSize: smaller.values[0],
              maxSize: larger.values[1],
              minWidth,
              maxWidth,
            }),
          });
        }
      }
      clampScales = [...clampScales, ...crossPairs];
    }

    return clampScales;
  };

  /**
   * Parses parameters from @fluid at-rule
   * @param {Array} params - Parsed parameter nodes
   * @returns {Object} Parsed configuration object
   */
  const parseAtRuleParams = (params) => {
    const clampsParams = {
      minWidth: config.minWidth,
      maxWidth: config.maxWidth,
      pairs: {},
      prefix: "space",
      generateAllCrossPairs: config.generateAllCrossPairs,
    };

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const nextParam = params[i + 1];
      if (!param || !nextParam) continue;
      const key = param.value;
      let value = nextParam.value.replace(/[:,]/g, "");

      switch (key) {
        case "minWidth":
        case "maxWidth":
          clampsParams[key] = Number(value);
          i++;
          break;
        case "prefix":
          clampsParams.prefix = value.replace(/['"]/g, "");
          i++;
          break;
        case "generateAllCrossPairs":
          clampsParams.generateAllCrossPairs = value === "true";
          i++;
          break;
      }
    }

    return clampsParams;
  };

  /**
   * Extracts pairs from parsed parameters
   * @param {Array} params - Parsed parameter nodes
   * @returns {Object} Pairs object with name: [min, max] entries
   */
  const extractPairs = (params) => {
    const pairs = {};
    const pairsStartIndex = params.findIndex((x) => x.value === "pairs");

    if (pairsStartIndex === -1) return pairs;

    let currentName = null;
    let currentValues = [];

    for (let i = pairsStartIndex + 1; i < params.length; i++) {
      const param = params[i];
      const value = param.value.replace("[", "").replace("]", "");
      if (!value || value === "[" || value === "]") continue;

      if (param.type === "string") {
        if (currentName && currentValues.length === 2) {
          pairs[currentName] = currentValues;
        }
        currentName = value;
        currentValues = [];
      } else {
        const numValue = Number(value);
        if (!isNaN(numValue)) currentValues.push(numValue);
      }

      if (currentName && currentValues.length === 2) {
        pairs[currentName] = currentValues;
      }
    }

    return pairs;
  };

  /**
   * Parses parameters from @ruler utility() at-rule
   * @param {Array} params - Parsed parameter nodes
   * @returns {Object} Parsed configuration object
   */
  const parseUtilityParams = (params) => {
    const utilityParams = {
      selector: null,
      property: null,
      scale: null,
      generateAllCrossPairs: null,
      attribute: null,
      lowSpecificity: null,
    };

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const nextParam = params[i + 1];
      if (!param || !nextParam) continue;
      const key = param.value;
      let value = nextParam.value.replace(/[:,]/g, "");

      switch (key) {
        case "selector":
        case "scale":
        case "attribute":
          utilityParams[key] = value.replace(/['"]/g, "");
          i++;
          break;
        case "property":
          // Check if it's an array (next token is '[')
          if (nextParam.value === "[") {
            // It's an array - collect values until we hit ']'
            const arrayValues = [];
            i += 2; // Skip 'property' and '['
            while (i < params.length && params[i].value !== "]") {
              if (params[i].type === "string") {
                arrayValues.push(params[i].value);
              }
              i++;
            }
            utilityParams.property = arrayValues;
          } else {
            // Single value
            utilityParams.property = value.replace(/['"]/g, "");
            i++;
          }
          break;
        case "generateAllCrossPairs":
          utilityParams.generateAllCrossPairs = value === "true";
          i++;
          break;
        case "lowSpecificity":
          utilityParams.lowSpecificity = value === "true";
          i++;
          break;
      }
    }

    return utilityParams;
  };

  /**
   * Processes @fluid at-rule and generates CSS custom properties
   * @param {Object} atRule - PostCSS at-rule node
   */
  const processFluidAtRule = (atRule) => {
    const { nodes } = CSSValueParser(atRule.params);
    const params = nodes[0].nodes.filter(
      (x) =>
        ["word", "string"].includes(x.type) &&
        x.value !== "{" &&
        x.value !== "}",
    );

    const clampsParams = parseAtRuleParams(params);
    clampsParams.pairs = extractPairs(params);

    if (Object.keys(clampsParams.pairs).length === 0) {
      throw new Error("[postcss-ruler] No pairs defined in @ruler scale()");
    }

    const clampPairs = Object.entries(clampsParams.pairs).map(
      ([name, values]) => ({ name, values }),
    );
    const clampScale = generateClamps({
      ...clampsParams,
      pairs: clampPairs,
    });

    // Store the scale for later use by utility classes
    scales[clampsParams.prefix] = clampScale;

    const postcss = require("postcss");
    const root = postcss.root();

    clampScale.forEach((step) => {
      root.append(
        postcss.decl({
          prop: `--${clampsParams.prefix}-${step.label}`,
          value: step.clamp,
        }),
      );
    });

    atRule.replaceWith(root.nodes);
  };

  /**
   * Processes @ruler utility() at-rule and generates utility classes
   * @param {Object} atRule - PostCSS at-rule node
   */
  const processUtilityAtRule = (atRule) => {
    const postcss = require("postcss");
    const { nodes } = CSSValueParser(atRule.params);
    const params = nodes[0].nodes.filter(
      (x) =>
        ["word", "string", "function"].includes(x.type) &&
        x.value !== "{" &&
        x.value !== "}",
    );

    const utilityParams = parseUtilityParams(params);

    // Resolve lowSpecificity from config if not explicitly set
    if (utilityParams.lowSpecificity === null) {
      utilityParams.lowSpecificity = config.lowSpecificity;
    }

    // Validate attribute-specific constraints first
    if (utilityParams.attribute !== null) {
      if (utilityParams.attribute === "") {
        throw new Error(
          "[postcss-ruler] @ruler utility() attribute parameter cannot be empty",
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(utilityParams.attribute)) {
        throw new Error(
          "[postcss-ruler] @ruler utility() attribute parameter must contain only letters, numbers, hyphens, and underscores",
        );
      }
    }

    // Validate required parameters
    if (!utilityParams.selector && !utilityParams.attribute) {
      throw new Error(
        '[postcss-ruler] @ruler utility() requires either "selector" or "attribute" parameter',
      );
    }
    if (!utilityParams.property) {
      throw new Error(
        '[postcss-ruler] @ruler utility() requires a "property" parameter',
      );
    }
    if (!utilityParams.scale) {
      throw new Error(
        '[postcss-ruler] @ruler utility() requires a "scale" parameter',
      );
    }

    // Check if scale exists
    const scale = scales[utilityParams.scale];
    if (!scale) {
      throw new Error(
        `[postcss-ruler] Scale "${utilityParams.scale}" not found. Define it with @ruler scale() first.`,
      );
    }

    // Determine which scale items to use
    let scaleItems = scale;
    if (utilityParams.generateAllCrossPairs === false) {
      // Filter out cross-pairs (items with hyphens in label)
      scaleItems = scale.filter((item) => !item.label.includes("-"));
    }

    // Normalize property to array
    const properties = Array.isArray(utilityParams.property)
      ? utilityParams.property
      : [utilityParams.property];

    // Generate utility classes as PostCSS nodes
    const rules = scaleItems.map((item) => {
      let ruleSelector;
      let ruleValue;

      if (utilityParams.attribute) {
        // Attribute mode: [data-attr="value"] or .class[data-attr="value"]
        const attrSelector = `[${utilityParams.attribute}="${item.label}"]`;
        const baseSelector = utilityParams.selector
          ? `${utilityParams.selector}${attrSelector}`
          : attrSelector;
        ruleSelector = utilityParams.lowSpecificity
          ? `:where(${baseSelector})`
          : baseSelector;
        ruleValue = `var(--${utilityParams.scale}-${item.label})`;
      } else {
        // Class mode (existing behavior)
        const baseSelector = `${utilityParams.selector}-${item.label}`;

        // Handle parent context selectors (e.g., ".container &")
        if (utilityParams.lowSpecificity) {
          if (utilityParams.selector.endsWith(" &")) {
            // Parent context: ".container &" -> ".container :where(&-xs)"
            const parentPart = utilityParams.selector.slice(0, -1); // Remove trailing "&"
            ruleSelector = `${parentPart}:where(&-${item.label})`;
          } else {
            // Regular selector: wrap entire selector
            ruleSelector = `:where(${baseSelector})`;
          }
        } else {
          ruleSelector = baseSelector;
        }

        ruleValue = item.clamp;
      }

      const rule = postcss.rule({ selector: ruleSelector });

      properties.forEach((prop) => {
        rule.append(postcss.decl({ prop, value: ruleValue }));
      });

      return rule;
    });

    atRule.replaceWith(rules);
  };

  /**
   * Processes inline fluid functions in declarations
   * @param {Object} decl - PostCSS declaration node
   */
  const processFluidDeclaration = (decl) => {
    const regex = /ruler\.fluid\(([^)]+)\)/g;
    let newValue = decl.value;
    let match;

    while ((match = regex.exec(decl.value)) !== null) {
      const args = match[1]
        .split(",")
        .map((s) => s.trim())
        .map(Number);
      let [minSize, maxSize, minWidth, maxWidth] = args;

      minWidth = minWidth || config.minWidth;
      maxWidth = maxWidth || config.maxWidth;

      if (!minSize || !maxSize) {
        throw new Error(
          "[postcss-ruler] ruler.fluid() requires minSize and maxSize",
        );
      }

      const clampValue = calculateClamp({
        minSize,
        maxSize,
        minWidth,
        maxWidth,
      });

      newValue = newValue.replace(match[0], clampValue);
    }

    if (newValue !== decl.value) {
      decl.value = newValue;
    }
  };

  return {
    postcssPlugin: "ruler",
    AtRule: {
      ruler: (atRule) => {
        if (atRule.params.startsWith("scale(")) {
          return processFluidAtRule(atRule);
        } else if (atRule.params.startsWith("utility(")) {
          return processUtilityAtRule(atRule);
        }
      },
    },
    Declaration(decl) {
      processFluidDeclaration(decl);
    },
  };
};

module.exports.postcss = true;
