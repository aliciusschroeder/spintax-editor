/**
 * Functions for generating spintax strings and random variants from node trees
 */

import { SpintaxNode } from "@/types";

/**
 * Generates a spintax string from a node tree
 *
 * @param node - The root node or any subtree to generate spintax from
 * @returns A spintax-formatted string
 */
export const generateSpintax = (
  node: SpintaxNode | null | undefined
): string => {
  if (!node) return "";

  switch (node.type) {
    case "text":
      return node.content || "";

    case "option":
      // Recursively generate content for all children and join them
      const childContent = node.children
        .map((child) => generateSpintax(child))
        .join("");
      // Prepend the option's own content
      return (node.content || "") + childContent;

    case "choice":
      if (!node.children || node.children.length === 0) return "{}";
      // Generate content for each option and join with the separator
      const options = node.children.map((child) => generateSpintax(child));
      // Join with '|' and wrap in braces
      return `{${options.join("|")}}`;

    case "root":
      // Generate content for all children and concatenate them
      return node.children.map((child) => generateSpintax(child)).join("");

    default:
      console.warn("generateSpintax encountered unknown node type");
      return "";
  }
};

/**
 * Generates a random variant from a spintax tree by randomly selecting
 * one option at each choice node
 *
 * @param node - The root node or any subtree to generate a variant from
 * @returns A single random variant with all choices resolved
 */
export const generateRandomVariant = (
  node: SpintaxNode | null | undefined
): string => {
  if (!node) return "";

  switch (node.type) {
    case "text":
      return node.content || "";

    case "option":
      // Generate content for all children and prepend option's own content
      const childContentOption = node.children
        .map((child) => generateRandomVariant(child))
        .join("");
      return (node.content || "") + childContentOption;

    case "choice":
      // Handle empty choice
      if (!node.children || node.children.length === 0) return "";

      // Select one random option
      const randomIndexChoice = Math.floor(
        Math.random() * node.children.length
      );
      const chosenOptionChoice = node.children[randomIndexChoice];

      // Generate variant from the chosen option
      return chosenOptionChoice
        ? generateRandomVariant(chosenOptionChoice)
        : "";

    case "root":
      // Generate variant for each child and join them
      return node.children
        .map((child) => generateRandomVariant(child))
        .join("");

    default:
      console.warn("generateRandomVariant encountered unknown node type");
      return "";
  }
};
