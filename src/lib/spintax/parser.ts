/**
 * Functions for parsing spintax strings into structured tree nodes
 */

import {
  ChoiceNode,
  OptionNode,
  RootNode,
  SpintaxNode
} from "@/types";

/**
 * Helper function to parse the content within a spintax option
 * Handles text and any nested choices within the option
 *
 * @param str - The complete spintax string
 * @param startIndex - The start position of this option's content
 * @param endIndex - The end position of this option's content
 * @returns An OptionNode with parsed content and children
 */
export const parseOptionContent = (
  str: string,
  startIndex: number,
  endIndex: number
): OptionNode => {
  // Create the initial option object
  const option: OptionNode = { type: "option", content: "", children: [] };
  let processingIndex = startIndex;

  while (processingIndex < endIndex) {
    let nextBrace = -1;
    const searchIndex = processingIndex;
    const braceIndex = str.indexOf("{", searchIndex);

    if (braceIndex !== -1 && braceIndex < endIndex) {
      nextBrace = braceIndex;
    }

    if (nextBrace === -1) {
      // No more nested choices, process remaining text
      const textContent = str
        .substring(processingIndex, endIndex)
        .replace(/\r\n|\r|\n/g, " ");
      if (textContent) {
        if (option.children.length === 0 && !option.content) {
          option.content = textContent;
        } else {
          option.children.push({ type: "text", content: textContent });
        }
      }
      processingIndex = endIndex;
    } else {
      // Process text before the next nested choice
      const textContent = str
        .substring(processingIndex, nextBrace)
        .replace(/\r\n|\r|\n/g, " ");
      if (textContent) {
        if (option.children.length === 0 && !option.content) {
          option.content = textContent;
        } else {
          option.children.push({ type: "text", content: textContent });
        }
      }

      // Parse the nested choice recursively
      const nestedResult = parseChoice(str, nextBrace);
      if (nestedResult?.choiceNode) {
        option.children.push(nestedResult.choiceNode);
        processingIndex = nestedResult.endIndex;
      } else {
        // Handle parsing failure
        console.warn(
          `Nested choice parsing failed at index ${nextBrace}. Skipping '{'.`
        );
        processingIndex = nextBrace + 1; // Skip the problematic character
      }
    }
  }

  // Clean up the option: trim content and filter empty text nodes
  if (option.content) option.content = option.content.trim();

  option.children = option.children
    .map((child: SpintaxNode): SpintaxNode => {
      if (child.type === "text" && child.content) {
        return { ...child, content: child.content.trim() };
      }
      return child;
    })
    .filter(
      (child: SpintaxNode): boolean =>
        !(child.type === "text" && !child.content)
    );

  // Simplify: if only one text child and no main content, move text to content
  if (
    !option.content &&
    option.children.length === 1 &&
    option.children[0].type === "text"
  ) {
    option.content = option.children[0].content;
    option.children = [];
  }

  // Remove final empty text nodes if content exists
  if (option.content && option.children.length > 0) {
    const lastChild = option.children[option.children.length - 1];
    if (lastChild.type === "text" && !lastChild.content) {
      option.children.pop();
    }
  }

  return option;
};

/**
 * Helper function to parse a spintax choice block
 * Handles the parsing of content between '{' and '}'
 *
 * @param str - The complete spintax string
 * @param startIndex - The index of the opening '{' character
 * @returns An object containing the parsed choice node and the index after the closing '}'
 */
export const parseChoice = (
  str: string,
  startIndex: number
): { choiceNode: ChoiceNode | null; endIndex: number } => {
  // Validation check for valid starting position
  if (startIndex >= str.length - 1 || str[startIndex] !== "{") {
    return { choiceNode: null, endIndex: startIndex + 1 };
  }

  // Initialize the choice node
  const choice: ChoiceNode = { type: "choice", children: [] };
  let i = startIndex + 1; // Move past the opening '{'
  let optionStartIndex = i;
  let braceDepth = 1; // Tracking nesting level

  while (i < str.length) {
    const char = str[i];
    let processedChar = false;

    if (char === "{") {
      braceDepth++;
    } else if (char === "}") {
      braceDepth--;
      if (braceDepth === 0) {
        // Matching closing brace found
        // Parse the final option before the closing brace
        const optionNode = parseOptionContent(str, optionStartIndex, i);
        if (optionNode) choice.children.push(optionNode);
        i++; // Move past '}'
        processedChar = true;
        break; // Parsing for this choice is complete
      } else if (braceDepth < 0) {
        // Malformed input with more closing than opening braces
        console.warn("Malformed spintax: Unexpected '}' at index", i);
        const optionNode = parseOptionContent(str, optionStartIndex, i);
        if (optionNode) choice.children.push(optionNode);
        processedChar = true;
        break;
      }
    } else if (char === "|" && braceDepth === 1) {
      // Option separator found at the current nesting level
      const optionNode = parseOptionContent(str, optionStartIndex, i);
      if (optionNode) choice.children.push(optionNode);
      i++; // Move past '|'
      optionStartIndex = i; // Start of next option
      processedChar = true;
    }

    if (!processedChar) {
      i++;
    }
  }

  // Handle unterminated choice (end of string reached without closing brace)
  if (braceDepth !== 0 && i === str.length) {
    console.warn(
      "Malformed spintax: Unterminated choice starting at index",
      startIndex
    );
    if (i > optionStartIndex) {
      const optionNode = parseOptionContent(str, optionStartIndex, i);
      if (optionNode) choice.children.push(optionNode);
    }
  }

  // Return the parsed choice or null if parsing failed
  const success = braceDepth === 0;
  return { choiceNode: success ? choice : null, endIndex: i };
};

/**
 * Main function to parse a spintax string into a tree structure
 *
 * @param text - The spintax string to parse
 * @returns A RootNode containing the parsed spintax tree
 */
export const parseSpintax = (text: string | null | undefined): RootNode => {
  // Initialize the root node
  const rootNode: RootNode = { type: "root", children: [] };

  if (typeof text !== "string" || !text) {
    return rootNode; // Return empty root for invalid input
  }

  const sourceText = text.trim();
  let currentIndex = 0;

  while (currentIndex < sourceText.length) {
    // Find the next choice starting character '{'
    const nextBrace = sourceText.indexOf("{", currentIndex);

    if (nextBrace === -1) {
      // No more choices, add remaining text as a text node
      const remainingText = sourceText
        .substring(currentIndex)
        .replace(/\r\n|\r|\n/g, " ");
      if (remainingText) {
        rootNode.children.push({ type: "text", content: remainingText });
      }
      currentIndex = sourceText.length; // End the loop
    } else {
      // Handle text before the next choice
      if (nextBrace > currentIndex) {
        const textBefore = sourceText
          .substring(currentIndex, nextBrace)
          .replace(/\r\n|\r|\n/g, " ");
        if (textBefore) {
          rootNode.children.push({ type: "text", content: textBefore });
        }
      }

      // Parse the choice node
      const choiceResult = parseChoice(sourceText, nextBrace);
      if (choiceResult?.choiceNode) {
        // Add valid choice node to the tree
        if (choiceResult.choiceNode.children.length > 0) {
          rootNode.children.push(choiceResult.choiceNode);
        } else {
          console.warn(
            `Empty choice block found at index ${nextBrace}. Skipping.`
          );
        }
        currentIndex = choiceResult.endIndex;
      } else {
        // Treat malformed braces as literal text
        console.warn(
          `Malformed spintax at index ${nextBrace}. Treating '{' as literal.`
        );
        rootNode.children.push({ type: "text", content: "{" });
        currentIndex = nextBrace + 1;
      }
    }
  }
  return rootNode;
};
