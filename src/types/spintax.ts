/**
 * Type definitions for the Spintax parsing and manipulation system
 *
 * Spintax uses a tree structure where:
 * - Root: The top-level container for the entire structure
 * - Choice: A set of options where one will be chosen (represented by {option1|option2})
 * - Option: A single item within a choice
 * - Text: Plain text content
 */

/**
 * Represents a path to a node in the spintax tree
 * Alternates between property names and indices, e.g. ['children', 0, 'children', 1]
 */
export type SpintaxPath = (string | number)[];

/**
 * Represents a simple text node with no children
 */
export interface TextNode {
  type: "text";
  content: string;
}

/**
 * Represents an option within a choice
 * Can contain text content directly and/or child nodes
 */
export interface OptionNode {
  type: "option";
  content: string;
  children: SpintaxNode[];
}

/**
 * Represents a choice between multiple options
 * In spintax format, this would be {option1|option2|option3}
 */
export interface ChoiceNode {
  type: "choice";
  children: OptionNode[]; // Choices directly contain options
}

/**
 * The root node of the spintax tree
 * Contains all top-level nodes
 */
export interface RootNode {
  type: "root";
  children: SpintaxNode[];
}

/**
 * Union type representing any node in the spintax tree
 */
export type SpintaxNode = TextNode | OptionNode | ChoiceNode | RootNode;
