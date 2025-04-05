/**
 * Function for calculating the total number of possible variations in a spintax tree
 */

import { SpintaxNode } from "@/types";

/**
 * Calculates the total number of unique variations possible from a spintax tree
 * Returns Infinity if the number of variations exceeds a safety threshold
 *
 * @param node - The root node or any subtree to calculate variations for
 * @returns The number of possible variations or Infinity if it exceeds limits
 */
export const calculateVariations = (
  node: SpintaxNode | null | undefined
): number | typeof Infinity => {
  // Base case: null or undefined node contributes 1 variation (empty string)
  if (!node) return 1;

  // Limit to prevent performance issues with deeply nested or large spintax
  const MAX_VARIATIONS = 1000000;

  try {
    switch (node.type) {
      case "text":
        // Text node represents a single path
        return 1;

      case "option":
        // Variations within an option are multiplicative
        let optionVariations = 1;
        for (const child of node.children) {
          const childVar = calculateVariations(child);
          // Handle Infinity propagation
          if (childVar === Infinity) return Infinity;
          optionVariations *= childVar;
          // Check for overflow
          if (optionVariations > MAX_VARIATIONS) return Infinity;
        }
        return optionVariations;

      case "choice":
        // Variations for a choice are additive across its options
        let choiceVariations = 0;
        if (!node.children || node.children.length === 0) {
          return 1; // An empty choice {} still counts as one path
        }
        for (const child of node.children) {
          const optionVars = calculateVariations(child);
          // Handle Infinity propagation
          if (optionVars === Infinity) return Infinity;
          choiceVariations += optionVars;
          // Check for overflow
          if (choiceVariations > MAX_VARIATIONS) return Infinity;
        }
        // If total is 0 (e.g., choice contains only empty options), it still represents 1 path
        return choiceVariations === 0 ? 1 : choiceVariations;

      case "root":
        // Variations at the root are multiplicative across children
        let rootVariationsCalc = 1;
        if (!node.children || node.children.length === 0) {
          return 1; // Empty root node
        }
        for (const child of node.children) {
          const childVarCalc = calculateVariations(child);
          // Handle Infinity propagation
          if (childVarCalc === Infinity) return Infinity;
          rootVariationsCalc *= childVarCalc;
          // Check for overflow
          if (rootVariationsCalc > MAX_VARIATIONS) return Infinity;
        }
        return rootVariationsCalc;

      default:
        console.warn("calculateVariations encountered unknown node type");
        return 1; // Treat unknown as 1 variation
    }
  } catch (error: unknown) {
    // Catch potential errors during calculation (stack overflow, etc.)
    console.error("Error calculating variations:", error);
    return Infinity; // Return Infinity on error
  }
};
