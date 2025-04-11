/**
 * SpintaxEditorTab Component
 *
 * Manages a single spintax entry with tree editor, preview, and export capabilities.
 * Contains tab navigation for different views of the same spintax.
 */

import { useSpintaxTree } from "@/hooks";
import {
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  Redo,
  RotateCw,
  Trash2,
  Undo,
} from "lucide-react";
import React, { useEffect, useState } from "react";
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
  // Use the spintax tree hook
  const {
    tree: spintaxTree,
    spintaxString: outputText,
    variationCount,
    randomVariant: randomPreview,
    error: parseError,
    history,
    redoStack,
    updateNode,
    deleteNode,
    addNode,
    generateVariant: generatePreview,
    undo: handleUndo,
    redo: handleRedo,
    clearAll: handleClearAll,
  } = useSpintaxTree(initialSpintax);

  // UI State
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "export">(
    "editor"
  );

  // Call onUpdate when the output text changes
  useEffect(() => {
    if (onUpdate && outputText !== initialSpintax) {
      onUpdate(outputText);
    }
  }, [outputText, onUpdate, initialSpintax]);

  // Clipboard copy handler
  const handleCopyOutput = () => {
    navigator.clipboard.writeText(outputText).catch((err) => {
      console.error("Failed to copy output text:", err);
    });
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
            <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-wrap flex-shrink-0 gap-2">
              {/* Left side: Add buttons */}
              <div className="flex space-x-2 items-center mb-1 sm:mb-0">
                <span className="text-sm font-medium mr-2 hidden sm:inline">
                  Add to Root:
                </span>
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
              {/* Right side: History and Clear buttons */}
              <div className="flex space-x-2 items-center">
                {/* Undo Button */}
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo last action"
                >
                  <Undo size={12} className="mr-1" /> Undo
                </button>
                {/* Redo Button */}
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo last undone action"
                >
                  <Redo size={12} className="mr-1" /> Redo
                </button>
                {/* Clear All Button */}
                <button
                  onClick={handleClearAll}
                  className="px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs flex items-center"
                  title="Clear the entire editor content"
                >
                  <Trash2 size={12} className="mr-1" /> Clear All
                </button>
              </div>
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

// Missing AlertCircle component import
const AlertCircle = ({
  size,
  className,
}: {
  size: number;
  className: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);
