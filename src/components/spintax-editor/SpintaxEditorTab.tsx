/**
 * SpintaxEditorTab Component
 *
 * Manages a single spintax entry with tree editor, preview, and export capabilities.
 * Contains tab navigation for different views of the same spintax.
 */

import {
  calculateVariations,
  generateRandomVariant,
  generateSpintax,
  parseSpintax,
} from "@/lib/spintax";
import { RootNode, SpintaxNode, SpintaxPath } from "@/types";
import {
  AlertCircle,
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { NodeEditor } from "./NodeEditor";

/**
 * Props interface for the SpintaxEditorTab component
 */
export interface SpintaxEditorTabProps {
  /** Initial spintax string to populate the editor */
  initialSpintax?: string;

  /** Callback when spintax is updated */
  onUpdate?: (newSpintax: string) => void;
}

/**
 * Component for editing, previewing, and exporting a single spintax entry
 */
export const SpintaxEditorTab: React.FC<SpintaxEditorTabProps> = ({
  initialSpintax = "",
  onUpdate,
}) => {
  // State for the spintax tree structure
  const [spintaxTree, setSpintaxTree] = useState<RootNode>(() => {
    try {
      return parseSpintax(initialSpintax);
    } catch (e) {
      console.error("Initial parse error:", e);
      return { type: "root", children: [] };
    }
  });

  // Additional state
  const [outputText, setOutputText] = useState<string>("");
  const [randomPreview, setRandomPreview] = useState<string>("");
  const [variationCount, setVariationCount] = useState<
    number | typeof Infinity
  >(() => {
    try {
      const initialTree = parseSpintax(initialSpintax);
      const vars = calculateVariations(initialTree);
      return vars === Infinity ? Infinity : typeof vars === "number" ? vars : 0;
    } catch (e) {
      console.error("Initial variation calculation error:", e);
      return 0;
    }
  });
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "export">(
    "editor"
  );
  const [parseError, setParseError] = useState<string | null>(null);

  // Effect to re-parse when initialSpintax prop changes
  useEffect(() => {
    try {
      setParseError(null);
      const tree = parseSpintax(initialSpintax);
      setSpintaxTree(tree);
      setRandomPreview(""); // Reset preview
      setOutputText(generateSpintax(tree));
      const vars = calculateVariations(tree);
      setVariationCount(
        vars === Infinity ? Infinity : typeof vars === "number" ? vars : 0
      );
    } catch (error: unknown) {
      console.error("Error parsing spintax in useEffect:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error during parsing";
      setParseError(`Error parsing spintax: ${errorMsg}`);
      setSpintaxTree({ type: "root", children: [] });
      setOutputText("");
      setVariationCount(0);
    }
  }, [initialSpintax]);

  // Effect to update output text, variation count, and call onUpdate when the tree changes
  useEffect(() => {
    if (!spintaxTree) {
      setOutputText("");
      setVariationCount(0);
      return;
    }

    let currentOutput = "";
    let currentVariationsResult: number | typeof Infinity = 0;
    let errorOccurred = false;

    try {
      currentOutput = generateSpintax(spintaxTree);
    } catch (error: unknown) {
      console.error("Error generating spintax:", error);
      currentOutput = `<Error generating spintax: ${
        error instanceof Error ? error.message : "Unknown error"
      }>`;
      errorOccurred = true;
    }

    try {
      currentVariationsResult = calculateVariations(spintaxTree);
      setVariationCount(
        currentVariationsResult === Infinity
          ? Infinity
          : typeof currentVariationsResult === "number"
          ? currentVariationsResult
          : 0
      );
    } catch (error: unknown) {
      console.error("Error calculating variations:", error);
      const isOverflow = error instanceof Error && error.message === "Overflow";
      setVariationCount(isOverflow ? Infinity : 0);
      errorOccurred = true;
    }

    setOutputText(currentOutput);

    // Avoid calling onUpdate if an error occurred during generation/calculation
    if (onUpdate && !errorOccurred) {
      let initialOutputFromProp = "";
      try {
        initialOutputFromProp = generateSpintax(
          parseSpintax(initialSpintax || "")
        );
      } catch {
        /* Ignore parse error of initial prop here */
      }

      if (currentOutput !== initialOutputFromProp) {
        onUpdate(currentOutput);
      }
    }
  }, [spintaxTree, onUpdate, initialSpintax]);

  // Helper to get a node by path (used in updateNode)
  const getNodeByPath = useCallback(
    (tree: RootNode | null, nodePath: SpintaxPath): SpintaxNode | null => {
      if (!tree || !nodePath) return null;
      if (nodePath.length === 0) return tree;

      let current: SpintaxNode | null = tree;
      try {
        for (let i = 0; i < nodePath.length; i += 2) {
          const prop = nodePath[i] as keyof SpintaxNode;
          const index = nodePath[i + 1] as number;

          // Type guard to ensure 'current' has the property 'prop'
          if (!current || !(prop in current)) {
            console.error(
              "Invalid path segment in getNodeByPath: Property missing.",
              prop,
              "in node",
              current
            );
            return null;
          }

          // Cast to unknown first for safer dynamic access
          const childrenArray = (
            current as unknown as { [key: string]: unknown }
          )[prop];

          if (
            !Array.isArray(childrenArray) ||
            childrenArray.length <= index ||
            index < 0
          ) {
            console.error(
              "Invalid path segment in getNodeByPath: Index out of bounds or not an array.",
              prop,
              index,
              "in node",
              current
            );
            return null;
          }

          current = childrenArray[index] as SpintaxNode;
        }
        return current;
      } catch (e) {
        console.error("Error in getNodeByPath:", e, "Path:", nodePath);
        return null;
      }
    },
    []
  );

  // Callback for NodeEditor to update a node
  const updateNode = useCallback(
    (
      path: SpintaxPath,
      newNodeOrFunction:
        | SpintaxNode
        | ((currentNode: SpintaxNode | null) => SpintaxNode | null)
    ) => {
      setSpintaxTree((prevTree: RootNode): RootNode => {
        try {
          // Deep clone to avoid mutation issues
          const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;

          const currentNodeSnapshot =
            typeof newNodeOrFunction === "function"
              ? getNodeByPath(newTree, path)
              : null;

          const newNode =
            typeof newNodeOrFunction === "function"
              ? newNodeOrFunction(currentNodeSnapshot)
              : newNodeOrFunction;

          if (!newNode) {
            console.warn(
              "Update function returned null, aborting update for path:",
              path
            );
            return prevTree;
          }

          // Handle root node update
          if (path.length === 0) {
            if (newNode.type === "root") {
              return newNode as RootNode;
            } else {
              console.error(
                "Attempted to replace root node with a non-root node:",
                newNode.type
              );
              return prevTree;
            }
          }

          // Navigate to the parent node
          const parentPath = path.slice(0, -2);
          let parent: SpintaxNode | null = newTree;
          for (let i = 0; i < parentPath.length; i += 2) {
            const prop = parentPath[i] as keyof SpintaxNode;
            const index = parentPath[i + 1] as number;

            if (!parent || !(prop in parent)) {
              throw new Error(
                `Invalid parent path segment during update: Property ${prop} missing`
              );
            }

            // Cast to unknown first for safer dynamic access
            const childrenArray = (
              parent as unknown as { [key: string]: unknown }
            )[prop];

            if (
              !Array.isArray(childrenArray) ||
              childrenArray.length <= index ||
              index < 0
            ) {
              throw new Error(
                `Invalid parent path segment during update: Index ${index} out of bounds for ${prop}`
              );
            }

            parent = childrenArray[index] as SpintaxNode;
          }

          const parentProperty = path[path.length - 2];
          const nodeIndex = path[path.length - 1] as number;

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
              return newTree;
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
              nodeIndex,
              "Parent Children:",
              parent && "children" in parent ? parent.children : "N/A"
            );
            throw new Error(`Invalid target location for node update`);
          }
        } catch (error: unknown) {
          console.error(
            "Update node failed:",
            error,
            "Path:",
            path,
            "Update:",
            newNodeOrFunction
          );
          return prevTree;
        }
      });
    },
    [getNodeByPath]
  );

  // Callback for NodeEditor to delete a node
  const deleteNode = useCallback((path: SpintaxPath) => {
    if (!path || path.length < 2) {
      console.warn("Attempted to delete root node or invalid path:", path);
      return;
    }

    setSpintaxTree((prevTree: RootNode): RootNode => {
      try {
        const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;

        // Navigate to parent node
        let parent: SpintaxNode | null = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
          const prop = path[i] as keyof SpintaxNode;
          const index = path[i + 1] as number;

          if (!parent || !(prop in parent)) {
            throw new Error(
              `Invalid path segment during delete navigation: Property ${prop} missing`
            );
          }

          // Cast to unknown first for safer dynamic access
          const childrenArray = (
            parent as unknown as { [key: string]: unknown }
          )[prop];

          if (
            !Array.isArray(childrenArray) ||
            childrenArray.length <= index ||
            index < 0
          ) {
            throw new Error(
              `Invalid path segment during delete navigation: Index ${index} out of bounds for ${prop}`
            );
          }

          parent = childrenArray[index] as SpintaxNode;
        }

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
            return newTree;
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
            nodeIndex,
            "Parent Children:",
            parent && "children" in parent ? parent.children : "N/A"
          );
          throw new Error(`Invalid target location for node deletion`);
        }
      } catch (error: unknown) {
        console.error("Delete node failed:", error, "Path:", path);
        return prevTree;
      }
    });
  }, []);

  // Callback for NodeEditor to add a node
  const addNode = useCallback((path: SpintaxPath, newNode: SpintaxNode) => {
    if (!path || path.length < 2 || !newNode) {
      console.warn(
        "Invalid arguments for addNode:",
        "Path:",
        path,
        "Node:",
        newNode
      );
      return;
    }

    setSpintaxTree((prevTree: RootNode): RootNode => {
      try {
        const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;

        // Navigate to parent node
        let parent: SpintaxNode | null = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
          const prop = path[i] as keyof SpintaxNode;
          const index = path[i + 1] as number;

          if (!parent || !(prop in parent)) {
            throw new Error(
              `Invalid path segment during add navigation: Property ${prop} missing`
            );
          }

          // Cast to unknown first for safer dynamic access
          const childrenArray = (
            parent as unknown as { [key: string]: unknown }
          )[prop];

          if (
            !Array.isArray(childrenArray) ||
            childrenArray.length <= index ||
            index < 0
          ) {
            throw new Error(
              `Invalid path segment during add navigation: Index ${index} out of bounds for ${prop}`
            );
          }

          parent = childrenArray[index] as SpintaxNode;
        }

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
            return newTree;
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
            targetIndex,
            "Parent Children:",
            parent && "children" in parent ? parent.children : "N/A"
          );
          throw new Error(`Invalid target location for node addition`);
        }
      } catch (error: unknown) {
        console.error(
          "Add node failed:",
          error,
          "Path:",
          path,
          "Node:",
          newNode
        );
        return prevTree;
      }
    });
  }, []);

  // Generate a random preview variant
  const generatePreview = useCallback(() => {
    try {
      if (!spintaxTree) {
        setRandomPreview("");
        return;
      }
      const preview = generateRandomVariant(spintaxTree);
      setRandomPreview(preview);
    } catch (error: unknown) {
      console.error("Error generating preview:", error);
      setRandomPreview(
        `<Error generating preview: ${
          error instanceof Error ? error.message : "Unknown error"
        }>`
      );
    }
  }, [spintaxTree]);

  // Clipboard copy handler
  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputText).catch((err) => {
      console.error("Failed to copy output text:", err);
    });
  };

  // Clear all content handler
  const handleClearAll = () => {
    setSpintaxTree({ type: "root", children: [] });
    setParseError(null);
  };

  // Format variation count for display
  const displayVariationCount =
    variationCount === Infinity
      ? "Overflow (>1M)"
      : variationCount.toLocaleString();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Tabs Navigation */}
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === "editor"
              ? "border-b-2 border-blue-500 font-medium text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setActiveTab("editor")}
        >
          <Pencil size={16} className="inline mr-1 mb-0.5" /> Editor
        </button>
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === "preview"
              ? "border-b-2 border-blue-500 font-medium text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => {
            setActiveTab("preview");
            generatePreview();
          }}
        >
          <Eye size={16} className="inline mr-1 mb-0.5" /> Preview
        </button>
        <button
          className={`px-4 py-2 text-sm ${
            activeTab === "export"
              ? "border-b-2 border-blue-500 font-medium text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
          onClick={() => setActiveTab("export")}
        >
          <FileText size={16} className="inline mr-1 mb-0.5" /> Export
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Tab */}
        {activeTab === "editor" && (
          <div className="flex-1 flex flex-col h-full">
            {/* Editor Actions Bar */}
            <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-wrap flex-shrink-0">
              <div className="flex space-x-2 items-center mb-1 sm:mb-0">
                <span className="text-sm font-medium mr-2">Add to Root:</span>
                {/* Add Text Node Button */}
                <button
                  onClick={() =>
                    addNode(["children", spintaxTree?.children?.length ?? 0], {
                      type: "text",
                      content: "new text",
                    })
                  }
                  className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-xs flex items-center"
                  title="Add Text block at the end of the root level"
                >
                  <Plus size={12} className="mr-1" /> Text
                </button>
                {/* Add Choice Node Button */}
                <button
                  onClick={() =>
                    addNode(["children", spintaxTree?.children?.length ?? 0], {
                      type: "choice",
                      children: [
                        { type: "option", content: "A", children: [] },
                        { type: "option", content: "B", children: [] },
                      ],
                    })
                  }
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs flex items-center"
                  title="Add Choice block {A|B} at the end of the root level"
                >
                  <Plus size={12} className="mr-1" /> Choice
                </button>
              </div>
              {/* Clear All Button */}
              <button
                onClick={handleClearAll}
                className="px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs flex items-center"
                title="Clear the entire editor content"
              >
                <Trash2 size={12} className="mr-1" /> Clear All
              </button>
            </div>

            {/* Editor Tree View Area */}
            <div className="flex-1 overflow-auto p-2 bg-white">
              {/* Display Parsing Error if exists */}
              {parseError ? (
                <div className="p-4 my-2 text-red-700 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center mb-1">
                    <AlertCircle size={18} className="mr-2 text-red-600" />
                    <p className="font-semibold">Spintax Parsing Error</p>
                  </div>
                  <p className="text-sm">{parseError}</p>
                  <p className="text-xs mt-2 text-gray-600">
                    Editor may be empty or showing partial structure. Please
                    check the input spintax.
                  </p>
                </div>
              ) : (
                // Render the NodeEditor for the root node if no parse error
                <div className="border rounded p-2 bg-gray-50 min-h-full">
                  {spintaxTree ? (
                    <NodeEditor
                      node={spintaxTree}
                      path={[]}
                      updateNode={updateNode}
                      deleteNode={deleteNode}
                      addNode={addNode}
                    />
                  ) : (
                    <p className="text-center text-gray-400 italic p-4">
                      Loading editor...
                    </p>
                  )}
                  {/* Show placeholder if tree is empty and no error */}
                  {(!spintaxTree ||
                    !spintaxTree.children ||
                    spintaxTree.children.length === 0) &&
                    !parseError && (
                      <p className="text-center text-gray-400 italic p-4">
                        {"Editor is empty. Use 'Add to Root' buttons to start."}
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Current Spintax Display Footer */}
            <div className="p-2 border-t bg-gray-50 flex-shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Spintax:</span>
                <span className="text-sm text-gray-600">
                  Total variations:{" "}
                  <span className="font-medium text-blue-800">
                    {displayVariationCount}
                  </span>
                </span>
              </div>
              {/* Display the generated spintax string */}
              <div className="mt-1 p-2 bg-white border rounded overflow-auto max-h-20">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {outputText || "<empty>"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="flex-1 flex flex-col">
            {/* Preview Actions Bar */}
            <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
              <button
                onClick={generatePreview}
                className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
              >
                <RotateCw size={14} className="mr-1" /> Generate New Preview
              </button>
              <span className="text-sm text-gray-600">
                {" "}
                Variations: {displayVariationCount}{" "}
              </span>
            </div>

            {/* Preview Display Area */}
            <div className="flex-1 overflow-auto p-4 bg-white">
              <div className="border rounded p-4 bg-gray-50 min-h-[100px] whitespace-pre-wrap">
                {randomPreview || (
                  <span className="text-gray-400 italic">
                    {
                      "Click 'Generate New Preview' to see a random variation here."
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <div className="flex-1 flex flex-col">
            {/* Export Actions Bar */}
            <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
              <button
                onClick={handleCopyOutput}
                className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
              >
                <Copy size={14} className="mr-1" /> Copy to Clipboard
              </button>
              <span className="text-sm text-gray-600">
                {" "}
                Variations: {displayVariationCount}{" "}
              </span>
            </div>

            {/* Export Text Area */}
            <div className="flex-1 overflow-auto p-4 bg-white">
              <textarea
                readOnly
                value={outputText}
                className="w-full h-full p-3 border rounded font-mono text-sm resize-none bg-gray-50"
                placeholder="Generated spintax will appear here..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
