/**
 * NodeEditor Component
 *
 * A recursive component that displays and allows editing of a node in the spintax tree.
 * Each node type (root, choice, option, text) has different editing capabilities.
 */

import {
  ChoiceNode,
  OptionNode,
  SpintaxNode,
  SpintaxPath,
  TextNode,
} from "@/types";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import React, { ChangeEvent, KeyboardEvent, useEffect, useState } from "react";

/**
 * Props interface for the NodeEditor component
 */
export interface NodeEditorProps {
  /** The node to be edited */
  node: SpintaxNode | null;

  /** Path to this node in the overall tree */
  path: SpintaxPath;

  /** Callback to update a node at the specified path */
  updateNode: (
    path: SpintaxPath,
    newNodeOrFn:
      | SpintaxNode
      | ((currentNode: SpintaxNode | null) => SpintaxNode | null)
  ) => void;

  /** Callback to delete a node at the specified path */
  deleteNode: (path: SpintaxPath) => void;

  /** Callback to add a new node at the specified path */
  addNode: (path: SpintaxPath, newNode: SpintaxNode) => void;
}

interface NodeContentDisplayProps {
  content: string | null;
}
const NodeContentDisplay: React.FC<NodeContentDisplayProps> = ({ content }) => {
  const announcedContent = [
    {content: "", element: <span className="italic text-gray-400">empty text</span>},
    {content: " ", element: <span className="italic text-gray-400">SPACE</span>},
    {content: "\n", element: <span className="italic text-gray-400">NEWLINE</span>},
    {content: "\t", element: <span className="italic text-gray-400">TAB</span>},
  ]
  const specialContent = announcedContent.find(item => item.content === content);
  return <>{specialContent ? specialContent.element : content}</>;
};

/**
 * Component for displaying and editing a node in the spintax tree
 */
export const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  path,
  updateNode,
  deleteNode,
  addNode,
}) => {
  // State for controlling UI behavior
  const [isExpanded, setIsExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(
    node && "content" in node ? node.content : ""
  );

  // Update local state when node prop changes
  useEffect(() => {
    if (node && "content" in node) {
      setEditContent(node.content ?? "");
    } else {
      setEditContent("");
    }
  }, [node]);

  // Early return for null node (must come after hooks)
  if (!node) {
    return (
      <div className="p-2 my-1 bg-red-100 text-red-800 rounded text-xs">
        Error: Missing node data
      </div>
    );
  }

  // Event handlers
  const handleToggle = () => setIsExpanded(!isExpanded);

  const handleEdit = () => {
    if ("content" in node) {
      setEditContent(node.content ?? "");
    }
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    if ("content" in node) {
      setEditContent(node.content ?? "");
    }
  };

  const handleDelete = () => deleteNode(path);

  const handleSave = () => {
    if ("content" in node) {
      updateNode(path, { ...node, content: editContent });
    }
    setEditMode(false);
  };

  // Add node handlers
  const handleAddOption = () => {
    if (node.type !== "choice") return;
    const newOption: OptionNode = { type: "option", content: "", children: [] };
    const newPath: SpintaxPath = [...path, "children", node.children.length];
    addNode(newPath, newOption);
  };

  const handleAddChoice = () => {
    if (node.type !== "option") return;
    const newChoice: ChoiceNode = {
      type: "choice",
      children: [
        { type: "option", content: "A", children: [] },
        { type: "option", content: "B", children: [] },
      ],
    };
    const newPath: SpintaxPath = [...path, "children", node.children.length];
    addNode(newPath, newChoice);
  };

  const handleAddText = () => {
    if (node.type !== "option") return;
    const newText: TextNode = { type: "text", content: "new text" };
    const newPath: SpintaxPath = [...path, "children", node.children.length];
    addNode(newPath, newText);
  };

  // Reorder handlers
  const handleMoveUp = () => {
    if (!path || path.length < 2) return;

    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number;

    if (currentIndex <= 0) return; // Already at the top

    updateNode(parentPath, (parentNode: SpintaxNode | null) => {
      if (!parentNode) {
        console.error("Cannot move up: Parent node is null");
        return parentNode;
      }

      if (parentNode.type === "text") {
        console.error("Cannot move up: Parent node is a text node with no children");
        return parentNode;
      }

      if (!Array.isArray(parentNode.children)) {
        console.error("Cannot move up: Parent node has no children array");
        return parentNode;
      }

      if (currentIndex >= parentNode.children.length) {
        console.error(
          "Cannot move up: Index out of bounds",
          currentIndex,
          parentNode.children.length
        );
        return parentNode;
      }

      const newChildren = [...parentNode.children];
      const [removed] = newChildren.splice(currentIndex, 1);
      newChildren.splice(currentIndex - 1, 0, removed);

      // Create a properly typed new node based on the parent type
      switch (parentNode.type) {
        case "root":
          return { ...parentNode, children: newChildren };
        case "choice":
          // Need to ensure we only have OptionNodes in a choice's children
          if (newChildren.every(child => child.type === "option")) {
            return {
              ...parentNode,
              children: newChildren as OptionNode[]
            };
          }
          console.error("Invalid child types for choice node");
          return parentNode;
        case "option":
          return { ...parentNode, children: newChildren };
        default:
          return parentNode;
      }
    });
  };

  const handleMoveDown = () => {
    if (!path || path.length < 2) return;

    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number;

    updateNode(parentPath, (parentNode: SpintaxNode | null) => {
      if (!parentNode) {
        console.error("Cannot move down: Parent node is null");
        return parentNode;
      }

      if (parentNode.type === "text") {
        console.error("Cannot move down: Parent node is a text node with no children");
        return parentNode;
      }

      if (!Array.isArray(parentNode.children)) {
        console.error("Cannot move down: Parent node has no children array");
        return parentNode;
      }

      if (currentIndex < 0 || currentIndex >= parentNode.children.length - 1) {
        return parentNode; // Already at the bottom or invalid index
      }

      const newChildren = [...parentNode.children];
      const [removed] = newChildren.splice(currentIndex, 1);
      newChildren.splice(currentIndex + 1, 0, removed);

      // Create a properly typed new node based on the parent type
      switch (parentNode.type) {
        case "root":
          return { ...parentNode, children: newChildren };
        case "choice":
          // Need to ensure we only have OptionNodes in a choice's children
          if (newChildren.every(child => child.type === "option")) {
            return {
              ...parentNode,
              children: newChildren as OptionNode[]
            };
          }
          console.error("Invalid child types for choice node");
          return parentNode;
        case "option":
          return { ...parentNode, children: newChildren };
        default:
          return parentNode;
      }
    });
  };

  // Helper functions
  const getIndex = (): number | null => {
    return path.length >= 2 ? (path[path.length - 1] as number) : null;
  };

  // Simplified version - show controls unless it's the root
  const shouldShowOrderControls = (): boolean => path.length > 0;

  // Simplified implementation; could be enhanced with proper sibling info
  const needsTextBetween = (): boolean => false;

  const handleInsertTextBefore = () => {
    if (!path || path.length < 2) return;
    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number;
    const newText: TextNode = { type: "text", content: " " };
    const insertPath: SpintaxPath = [...parentPath, "children", currentIndex];
    addNode(insertPath, newText);
  };

  // Visual styling
  const getNodeColor = (): string => {
    switch (node.type) {
      case "root":
        return "bg-gray-100";
      case "choice":
        return "bg-blue-100";
      case "option":
        return "bg-green-100";
      case "text":
        return "bg-yellow-100";
      default:
        return "bg-red-100"; // Error case
    }
  };

  // Determine node characteristics
  const canHaveChildren =
    node.type === "root" || node.type === "choice" || node.type === "option";
  const hasChildren =
    canHaveChildren &&
    "children" in node &&
    Array.isArray(node.children) &&
    node.children.length > 0;
  const showOrderControls = shouldShowOrderControls();
  const nodeIndex = getIndex();

  return (
    <div
      className={`rounded p-2 mb-1 ${getNodeColor()} border border-gray-300`}
    >
      {/* Warning for consecutive choices (currently disabled) */}
      {needsTextBetween() && (
        <div className="mb-1 bg-orange-100 rounded p-1 flex justify-center">
          <button
            onClick={handleInsertTextBefore}
            className="text-xs text-orange-800 flex items-center px-2 py-0.5 bg-orange-200 rounded hover:bg-orange-300"
            title="Add text between choices"
          >
            <Plus size={10} className="mr-1" /> Insert Text
          </button>
        </div>
      )}

      {/* Node Header Row */}
      <div className="flex items-center space-x-2">
        {/* Toggle Expansion Button */}
        <div className="w-4 flex-shrink-0">
          {canHaveChildren && hasChildren && (
            <button
              onClick={handleToggle}
              className="focus:outline-none text-gray-500 hover:text-gray-800"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
        </div>

        {/* Content / Type Display Area */}
        <div className="flex-1 min-w-0">
          {/* Edit Mode Input */}
          {editMode && (node.type === "text" || node.type === "option") ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editContent}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEditContent(e.target.value)
                }
                className="flex-1 p-1 border rounded bg-white text-sm"
                autoFocus
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                aria-label="Edit node content"
              />
              <button
                onClick={handleSave}
                className="p-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="p-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            // Display Mode
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-600 uppercase w-16 flex-shrink-0">
                {node.type}
              </span>
              {node.type === "text" || node.type === "option" ? (
                // Display content for Text/Option nodes
                <span
                  className="cursor-pointer hover:bg-gray-200/50 px-1 py-0.5 rounded flex-1 break-words min-w-0 text-sm"
                  onClick={handleEdit}
                  title="Click to edit"
                >
                  <NodeContentDisplay content={node.content} />
                </span>
              ) : (
                // Display info for Choice/Root nodes
                <span className="p-1 text-sm text-gray-700">
                  {node.type === "choice"
                    ? `${node.children?.length ?? 0} options`
                    : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Order Controls */}
        {showOrderControls && (
          <div className="flex space-x-1 mr-1">
            <button
              onClick={handleMoveUp}
              className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Move Up"
              disabled={nodeIndex === null || nodeIndex <= 0}
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={handleMoveDown}
              className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Move Down"
            >
              <ArrowDown size={12} />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-1 flex-shrink-0">
          {/* Edit button */}
          {(node.type === "text" || node.type === "option") && !editMode && (
            <button
              onClick={handleEdit}
              className="p-1 text-blue-500 hover:bg-blue-100 rounded"
              title="Edit Content"
            >
              <Pencil size={14} />
            </button>
          )}

          {/* Delete button */}
          {node.type !== "root" && (
            <button
              onClick={handleDelete}
              className="p-1 text-red-500 hover:bg-red-100 rounded"
              title="Delete Node"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Add Option button (for Choice nodes) */}
          {node.type === "choice" && (
            <button
              onClick={handleAddOption}
              className="p-1 text-green-500 hover:bg-green-100 rounded flex items-center"
              title="Add Option"
            >
              <Plus size={14} /> <span className="text-xs ml-0.5">Opt</span>
            </button>
          )}

          {/* Add Text/Choice buttons (for Option nodes) */}
          {node.type === "option" && (
            <>
              <button
                onClick={handleAddText}
                className="p-1 text-yellow-600 hover:bg-yellow-100 rounded flex items-center"
                title="Add Text Node inside Option"
              >
                <Plus size={14} /> <span className="text-xs ml-0.5">Txt</span>
              </button>
              <button
                onClick={handleAddChoice}
                className="p-1 text-blue-500 hover:bg-blue-100 rounded flex items-center"
                title="Add Choice Node inside Option"
              >
                <Plus size={14} />{" "}
                <span className="text-xs ml-0.5">Choice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Children Area - Render recursively */}
      {isExpanded && canHaveChildren && hasChildren && (
        <div className="pl-6 mt-1 border-l-2 border-gray-300 ml-2">
          {node.children.map((child, index) => (
            <NodeEditor
              key={index}
              node={child}
              path={[...path, "children", index]}
              updateNode={updateNode}
              deleteNode={deleteNode}
              addNode={addNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
