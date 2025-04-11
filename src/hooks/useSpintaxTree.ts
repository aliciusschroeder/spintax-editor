/**
 * useSpintaxTree Hook
 *
 * A custom hook for managing a spintax tree structure.
 * Provides functionality for creating, updating, deleting, and navigating nodes.
 */

import {
  calculateVariations,
  generateRandomVariant,
  generateSpintax,
  parseSpintax,
} from "@/lib/spintax";
import { getNodeByPathInDraft } from "@/lib/treeUtils";
import {
  ChoiceNode,
  OptionNode,
  RootNode,
  SpintaxNode,
  SpintaxPath,
  TextNode,
} from "@/types";
import { produce } from "immer";
import { useCallback, useState } from "react";

/**
 * Return type for the useSpintaxTree hook
 */
interface UseSpintaxTreeReturn {
  /** The current spintax tree structure */
  tree: RootNode;

  /** The generated spintax string */
  spintaxString: string;

  /** The calculated number of possible variations */
  variationCount: number | typeof Infinity;

  /** The most recently generated random variant */
  randomVariant: string;

  /** Any error that occurred during parsing or generation */
  error: string | null;

  /** Update the tree with a new spintax string */
  setSpintaxString: (spintax: string) => void;

  /** Update a node at the specified path */
  updateNode: (
    path: SpintaxPath,
    newNodeOrFn:
      | SpintaxNode
      | ((currentNode: SpintaxNode | null) => SpintaxNode | null)
  ) => void;

  /** Delete a node at the specified path */
  deleteNode: (path: SpintaxPath) => void;

  /** Add a new node at the specified path */
  addNode: (path: SpintaxPath, newNode: SpintaxNode) => void;

  /** Generate a new random variant */
  generateVariant: () => void;

  /** Add a new text node to the root */
  addTextToRoot: (content?: string) => void;

  /** Add a new choice node to the root */
  addChoiceToRoot: (options?: string[]) => void;
}

/**
 * Custom hook for managing a spintax tree
 *
 * @param initialSpintax - Initial spintax string to parse
 * @returns An object with the tree and functions to manipulate it
 */
export const useSpintaxTree = (
  initialSpintax?: string
): UseSpintaxTreeReturn => {
  // Parse the initial spintax string or create an empty tree
  const [tree, setTree] = useState<RootNode>(() => {
    try {
      if (initialSpintax) {
        return parseSpintax(initialSpintax);
      }
      return { type: "root", children: [] };
    } catch (e) {
      console.error("Error parsing initial spintax:", e);
      return { type: "root", children: [] };
    }
  });

  // Derived state
  const [spintaxString, setSpintaxStringState] = useState<string>(() => {
    try {
      return initialSpintax || generateSpintax(tree);
    } catch (e) {
      console.error("Error generating initial spintax string:", e);
      return "";
    }
  });

  const [variationCount, setVariationCount] = useState<
    number | typeof Infinity
  >(() => {
    try {
      const count = calculateVariations(tree);
      return typeof count === "number" ? count : Infinity;
    } catch (e) {
      console.error("Error calculating initial variations:", e);
      return 0;
    }
  });

  const [randomVariant, setRandomVariant] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Update state from the tree
  const updateStateFromTree = useCallback((newTree: RootNode) => {
    try {
      setError(null);

      // Generate spintax string
      const newSpintaxString = generateSpintax(newTree);
      setSpintaxStringState(newSpintaxString);

      // Calculate variation count
      const newVariationCount = calculateVariations(newTree);
      setVariationCount(newVariationCount);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error updating from tree: ${errorMsg}`);
      console.error("Error updating from tree:", e);
    }
  }, []);

  // Set a new spintax string and parse it into a tree
  const setSpintaxString = useCallback((spintax: string) => {
    try {
      setError(null);
      const newTree = parseSpintax(spintax);
      setTree(newTree);
      setSpintaxStringState(spintax);

      // Calculate variation count
      const newVariationCount = calculateVariations(newTree);
      setVariationCount(newVariationCount);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error parsing spintax: ${errorMsg}`);
      console.error("Error parsing spintax:", e);
    }
  }, []);

  // Update a node at the specified path
  const updateNode = useCallback(
    (
      path: SpintaxPath,
      newNodeOrFn:
        | SpintaxNode
        | ((currentNode: SpintaxNode | null) => SpintaxNode | null)
    ) => {
      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            // Handle root node update
            if (path.length === 0) {
              const updatedNode =
                typeof newNodeOrFn === "function"
                  ? newNodeOrFn(draft)
                  : newNodeOrFn;

              if (!updatedNode) {
                return;
              }

              if (updatedNode.type !== "root") {
                throw new Error("Cannot replace root with non-root node");
              }

              // Since we can't just assign to the draft directly (that would replace the proxy),
              // we need to update its properties instead
              Object.assign(draft, updatedNode);
              return;
            }

            // Get the current node to update
            const currentNode = getNodeByPathInDraft(draft, path);

            // Calculate the new node
            const newNode =
              typeof newNodeOrFn === "function"
                ? newNodeOrFn(currentNode)
                : newNodeOrFn;

            if (!newNode) {
              return;
            }

            // Get the parent path and index
            const parentPath = path.slice(0, -2);
            const parentNode = getNodeByPathInDraft(draft, parentPath);

            if (!parentNode) {
              throw new Error("Parent node not found");
            }

            if (
              !(
                parentNode.type === "root" ||
                parentNode.type === "choice" ||
                parentNode.type === "option"
              )
            ) {
              throw new Error(
                `Parent node of type ${parentNode.type} cannot have children`
              );
            }

            const nodeIndex = path[path.length - 1] as number;

            // Update the node in the parent's children array
            if (nodeIndex >= 0 && nodeIndex < parentNode.children.length) {
              parentNode.children[nodeIndex] = newNode;
            } else {
              throw new Error("Invalid path or index out of bounds");
            }
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error updating node: ${errorMsg}`);
          console.error("Error updating node:", e);
          return prevTree;
        }
      });

      // Update derived state after tree changes
      updateStateFromTree(tree);
    },
    [tree, updateStateFromTree]
  );

  // Delete a node at the specified path
  const deleteNode = useCallback(
    (path: SpintaxPath) => {
      if (!path || path.length < 2) {
        setError("Cannot delete root node");
        return;
      }

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            const parentPath = path.slice(0, -2);
            const parentNode = getNodeByPathInDraft(draft, parentPath);

            if (!parentNode) {
              throw new Error("Parent node not found");
            }

            if (
              !(
                parentNode.type === "root" ||
                parentNode.type === "choice" ||
                parentNode.type === "option"
              )
            ) {
              throw new Error(
                `Parent node of type ${parentNode.type} cannot have children`
              );
            }

            const nodeIndex = path[path.length - 1] as number;

            // Delete the node from the parent's children array
            if (nodeIndex >= 0 && nodeIndex < parentNode.children.length) {
              parentNode.children.splice(nodeIndex, 1);
            } else {
              throw new Error("Invalid path or index out of bounds");
            }
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error deleting node: ${errorMsg}`);
          console.error("Error deleting node:", e);
          return prevTree;
        }
      });

      // Update derived state after tree changes
      updateStateFromTree(tree);
    },
    [tree, updateStateFromTree]
  );

  // Add a new node at the specified path
  const addNode = useCallback(
    (path: SpintaxPath, newNode: SpintaxNode) => {
      if (!path || path.length < 2 || !newNode) {
        setError("Invalid path or node");
        return;
      }

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            const parentPath = path.slice(0, -2);
            const parentNode = getNodeByPathInDraft(draft, parentPath);

            if (!parentNode) {
              throw new Error("Parent node not found");
            }

            if (
              !(
                parentNode.type === "root" ||
                parentNode.type === "choice" ||
                parentNode.type === "option"
              )
            ) {
              throw new Error(
                `Parent node of type ${parentNode.type} cannot have children`
              );
            }

            const nodeIndex = path[path.length - 1] as number;

            // Add the node to the parent's children array
            const validIndex = Math.max(
              0,
              Math.min(nodeIndex, parentNode.children.length)
            );
            parentNode.children.splice(validIndex, 0, newNode);
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error adding node: ${errorMsg}`);
          console.error("Error adding node:", e);
          return prevTree;
        }
      });

      // Update derived state after tree changes
      updateStateFromTree(tree);
    },
    [tree, updateStateFromTree]
  );

  // Generate a new random variant
  const generateVariant = useCallback(() => {
    try {
      const variant = generateRandomVariant(tree);
      setRandomVariant(variant);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error generating variant: ${errorMsg}`);
      console.error("Error generating variant:", e);
    }
  }, [tree]);

  // Add a new text node to the root
  const addTextToRoot = useCallback(
    (content: string = "new text") => {
      const newTextNode: TextNode = { type: "text", content };

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            // Add the text node to the root's children array
            draft.children.push(newTextNode);
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error adding text to root: ${errorMsg}`);
          console.error("Error adding text to root:", e);
          return prevTree;
        }
      });

      // Update derived state after tree changes
      updateStateFromTree(tree);
    },
    [tree, updateStateFromTree]
  );

  // Add a new choice node to the root
  // Add a new choice node to the root
  const addChoiceToRoot = useCallback(
    (options: string[] = ["A", "B"]) => {
      const optionNodes: OptionNode[] = options.map((text) => ({
        type: "option",
        content: text,
        children: [],
      }));

      const newChoiceNode: ChoiceNode = {
        type: "choice",
        children: optionNodes,
      };

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            // Add the choice node to the root's children array
            draft.children.push(newChoiceNode);
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error adding choice to root: ${errorMsg}`);
          console.error("Error adding choice to root:", e);
          return prevTree;
        }
      });

      // Update derived state after tree changes
      updateStateFromTree(tree);
    },
    [tree, updateStateFromTree]
  );

  return {
    tree,
    spintaxString,
    variationCount,
    randomVariant,
    error,
    setSpintaxString,
    updateNode,
    deleteNode,
    addNode,
    generateVariant,
    addTextToRoot,
    addChoiceToRoot,
  };
};
