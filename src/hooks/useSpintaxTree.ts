/**
 * useSpintaxTree Hook
 *
 * A custom hook for managing a spintax tree structure.
 * Provides functionality for creating, updating, deleting, and navigating nodes.
 * Includes history management for undo/redo functionality.
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
import { useCallback, useEffect, useState } from "react";

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

  /** History array for undo functionality */
  history: RootNode[];

  /** Redo stack for redo functionality */
  redoStack: RootNode[];

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

  /** Undo the last change */
  undo: () => void;

  /** Redo the last undone change */
  redo: () => void;

  /** Clear all content in the tree */
  clearAll: () => void;
}

// Maximum number of history entries to keep
const MAX_HISTORY_SIZE = 50;

/**
 * Custom hook for managing a spintax tree with history
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

  // History management state
  const [history, setHistory] = useState<RootNode[]>([]);
  const [redoStack, setRedoStack] = useState<RootNode[]>([]);

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

  // Update derived state based on the current tree
  const updateDerivedState = useCallback((currentTree: RootNode) => {
    try {
      setError(null);

      // Generate spintax string
      const newSpintaxString = generateSpintax(currentTree);
      setSpintaxStringState(newSpintaxString);

      // Calculate variation count
      const newVariationCount = calculateVariations(currentTree);
      setVariationCount(newVariationCount);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error updating derived state: ${errorMsg}`);
      console.error("Error updating derived state:", e);
    }
  }, []);

  // Update derived state whenever the tree changes
  useEffect(() => {
    updateDerivedState(tree);
  }, [tree, updateDerivedState]);

  // Helper function to add an entry to history
  const addToHistory = useCallback((prevTree: RootNode) => {
    setHistory((prev) => {
      const newHistory = [prevTree, ...prev];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(0, MAX_HISTORY_SIZE);
      }
      return newHistory;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);

  // Set a new spintax string and parse it into a tree
  const setSpintaxString = useCallback(
    (spintax: string) => {
      try {
        setError(null);
        // Add current tree to history before updating
        addToHistory(tree);
        const newTree = parseSpintax(spintax);
        setTree(newTree);
        // Derived state will be updated by the useEffect
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        setError(`Error parsing spintax: ${errorMsg}`);
        console.error("Error parsing spintax:", e);
      }
    },
    [tree, addToHistory]
  );

  // Update a node at the specified path
  const updateNode = useCallback(
    (
      path: SpintaxPath,
      newNodeOrFn:
        | SpintaxNode
        | ((currentNode: SpintaxNode | null) => SpintaxNode | null)
    ) => {
      // Add current tree to history before updating
      addToHistory(tree);

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

            // Handle function-based node updates
            const currentNodeInDraft =
              typeof newNodeOrFn === "function"
                ? getNodeByPathInDraft(draft, path)
                : null;

            const newNode =
              typeof newNodeOrFn === "function"
                ? newNodeOrFn(currentNodeInDraft)
                : newNodeOrFn;

            if (!newNode) {
              console.warn(
                "Update function returned null, aborting update for path:",
                path
              );
              return; // Early return in Immer doesn't modify state
            }

            // Navigate to the parent node
            const parentPath = path.slice(0, -2);
            const parentProperty = path[path.length - 2];
            const nodeIndex = path[path.length - 1] as number;

            const parent = getNodeByPathInDraft(draft, parentPath);

            // Update the node in the parent's children array
            if (
              parent &&
              parentProperty === "children" &&
              (parent.type === "root" ||
                parent.type === "choice" ||
                parent.type === "option")
            ) {
              if (
                Array.isArray(parent.children) &&
                parent.children.length > nodeIndex &&
                nodeIndex >= 0
              ) {
                parent.children[nodeIndex] = newNode;
              } else {
                console.error(
                  "Invalid target for update: Index out of bounds.",
                  "Parent:",
                  parent,
                  "Property:",
                  parentProperty,
                  "Index:",
                  nodeIndex
                );
                throw new Error(
                  `Invalid target location for node update: Index out of bounds`
                );
              }
            } else {
              console.error(
                "Invalid target for update:",
                "Parent:",
                parent,
                "Property:",
                parentProperty,
                "Index:",
                nodeIndex
              );
              throw new Error(`Invalid target location for node update`);
            }
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error updating node: ${errorMsg}`);
          console.error("Error updating node:", e);
          return prevTree;
        }
      });
      // Derived state will be updated by the useEffect
    },
    [tree, addToHistory]
  );

  // Delete a node at the specified path
  const deleteNode = useCallback(
    (path: SpintaxPath) => {
      if (!path || path.length < 2) {
        setError("Cannot delete root node");
        return;
      }

      // Add current tree to history before deleting
      addToHistory(tree);

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            // Navigate to parent node
            const parentPath = path.slice(0, -2);
            const parent = getNodeByPathInDraft(draft, parentPath);

            const parentProperty = path[path.length - 2];
            const nodeIndex = path[path.length - 1] as number;

            // Delete the node from the parent's children array
            if (
              parent &&
              parentProperty === "children" &&
              (parent.type === "root" ||
                parent.type === "choice" ||
                parent.type === "option")
            ) {
              if (
                Array.isArray(parent.children) &&
                parent.children.length > nodeIndex &&
                nodeIndex >= 0
              ) {
                parent.children.splice(nodeIndex, 1);
              } else {
                console.error(
                  "Invalid target for delete: Index out of bounds.",
                  "Parent:",
                  parent,
                  "Property:",
                  parentProperty,
                  "Index:",
                  nodeIndex
                );
                throw new Error(
                  `Invalid target location for node deletion: Index out of bounds`
                );
              }
            } else {
              console.error(
                "Invalid target for delete:",
                "Parent:",
                parent,
                "Property:",
                parentProperty,
                "Index:",
                nodeIndex
              );
              throw new Error(`Invalid target location for node deletion`);
            }
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error deleting node: ${errorMsg}`);
          console.error("Error deleting node:", e);
          return prevTree;
        }
      });
      // Derived state will be updated by the useEffect
    },
    [tree, addToHistory]
  );

  // Add a new node at the specified path
  const addNode = useCallback(
    (path: SpintaxPath, newNode: SpintaxNode) => {
      if (!path || path.length < 2 || !newNode) {
        setError("Invalid path or node");
        return;
      }

      // Add current tree to history before adding
      addToHistory(tree);

      setTree((prevTree) => {
        try {
          return produce(prevTree, (draft) => {
            // Navigate to parent node
            const parentPath = path.slice(0, -2);
            const parent = getNodeByPathInDraft(draft, parentPath);

            const parentProperty = path[path.length - 2];
            const targetIndex = path[path.length - 1] as number;

            // Add the node to the parent's children array
            if (
              parent &&
              parentProperty === "children" &&
              (parent.type === "root" ||
                parent.type === "choice" ||
                parent.type === "option")
            ) {
              if (Array.isArray(parent.children)) {
                const validIndex = Math.max(
                  0,
                  Math.min(targetIndex, parent.children.length)
                );
                parent.children.splice(validIndex, 0, newNode);
              } else {
                console.error(
                  "Invalid target for add: Parent children is not an array.",
                  "Parent:",
                  parent,
                  "Property:",
                  parentProperty,
                  "Index:",
                  targetIndex
                );
                throw new Error(
                  `Invalid target location for node addition: Children not an array`
                );
              }
            } else {
              console.error(
                "Invalid target for add:",
                "Parent:",
                parent,
                "Property:",
                parentProperty,
                "Index:",
                targetIndex
              );
              throw new Error(`Invalid target location for node addition`);
            }
          });
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          setError(`Error adding node: ${errorMsg}`);
          console.error("Error adding node:", e);
          return prevTree;
        }
      });
      // Derived state will be updated by the useEffect
    },
    [tree, addToHistory]
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

      // Add current tree to history before adding
      addToHistory(tree);

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
      // Derived state will be updated by the useEffect
    },
    [tree, addToHistory]
  );

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

      // Add current tree to history before adding
      addToHistory(tree);

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
      // Derived state will be updated by the useEffect
    },
    [tree, addToHistory]
  );

  // Undo the last change
  const undo = useCallback(() => {
    if (history.length === 0) return;

    const previousState = history[0];
    const newHistory = history.slice(1);

    setRedoStack((prevRedo) => [tree, ...prevRedo]);
    setHistory(newHistory);
    setTree(previousState);
  }, [history, tree]);

  // Redo the last undone change
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setHistory((prevHistory) => [tree, ...prevHistory]);
    setRedoStack(newRedoStack);
    setTree(nextState);
  }, [redoStack, tree]);

  // Clear all content in the tree
  const clearAll = useCallback(() => {
    // Add current tree to history before clearing
    addToHistory(tree);

    setTree(
      produce((draft) => {
        draft.children = [];
      })
    );
    setError(null);
  }, [tree, addToHistory]);

  return {
    tree,
    spintaxString,
    variationCount,
    randomVariant,
    error,
    history,
    redoStack,
    setSpintaxString,
    updateNode,
    deleteNode,
    addNode,
    generateVariant,
    addTextToRoot,
    addChoiceToRoot,
    undo,
    redo,
    clearAll,
  };
};
