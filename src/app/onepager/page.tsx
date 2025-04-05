"use client"

import { exampleSpintax, exampleYaml } from '@/config/presets';
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Download, Eye, FileCode, FileText, Pencil, Plus, RotateCw, Trash2, Upload } from 'lucide-react';
import React, { useCallback, useEffect, useState, KeyboardEvent, ChangeEvent } from 'react';

// --- Type Definitions ---
type SpintaxPath = (string | number)[];

interface TextNode {
  type: 'text';
  content: string;
}

interface OptionNode {
  type: 'option';
  content: string;
  children: SpintaxNode[];
}

interface ChoiceNode {
  type: 'choice';
  children: OptionNode[]; // Choices directly contain options
}

interface RootNode {
  type: 'root';
  children: SpintaxNode[];
}

type SpintaxNode = TextNode | OptionNode | ChoiceNode | RootNode;

// Placeholder types for YAML functions (assuming simple string key/value)
type YamlEntries = Record<string, string>;

// Placeholder function definitions (replace with actual implementations if available)
const parseYaml = (yamlString: string): YamlEntries => {
  console.warn("parseYaml is a placeholder and does not actually parse YAML.");
  // Basic line-by-line parsing for demo purposes
  const lines = yamlString.split('\n');
  const entries: YamlEntries = {};
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      if (key && value) {
        entries[key] = value;
      }
    }
  });
  return entries;
};

const generateYaml = (entries: YamlEntries): string => {
  console.warn("generateYaml is a placeholder and does not actually generate YAML.");
  return Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};


// Helper to parse content within an option (text and nested choices)
const parseOptionContent = (str: string, startIndex: number, endIndex: number): OptionNode => {
    // Explicitly type the initial object
    const option: OptionNode = { type: 'option', content: '', children: [] };
    let processingIndex = startIndex;

    while (processingIndex < endIndex) {
        let nextBrace = -1;
        const searchIndex = processingIndex;
        const braceIndex = str.indexOf('{', searchIndex);
        if (braceIndex !== -1 && braceIndex < endIndex) {
            nextBrace = braceIndex;
        }

        if (nextBrace === -1) {
            // No more nested choices, process remaining text
            const textContent = str.substring(processingIndex, endIndex).replace(/\r\n|\r|\n/g, ' ');
            if (textContent) {
                if (option.children.length === 0 && !option.content) {
                    option.content = textContent;
                } else {
                    // Ensure pushed object matches TextNode type
                    option.children.push({ type: 'text', content: textContent });
                }
            }
            processingIndex = endIndex;
        } else {
            // Text before the nested choice
            const textContent = str.substring(processingIndex, nextBrace).replace(/\r\n|\r|\n/g, ' ');
            if (textContent) {
                if (option.children.length === 0 && !option.content) {
                    option.content = textContent;
                } else {
                     // Ensure pushed object matches TextNode type
                    option.children.push({ type: 'text', content: textContent });
                }
            }

            // Parse the nested choice recursively using parseChoice
            const nestedResult = parseChoice(str, nextBrace);
            // Check if choiceNode exists before pushing
            if (nestedResult?.choiceNode) {
              option.children.push(nestedResult.choiceNode); // Push ChoiceNode
              processingIndex = nestedResult.endIndex;
            } else {
              // Handle case where parseChoice returns null or error
              console.warn(`Nested choice parsing failed or returned null at index ${nextBrace}. Skipping '{'.`);
              processingIndex = nextBrace + 1; // Move past the '{' to avoid infinite loop
            }
        }
    }

    // Trim content and filter empty text children for cleaner output
    if (option.content) option.content = option.content.trim();
    // Ensure map returns the correct type and filter works as expected
    option.children = option.children.map((child: SpintaxNode): SpintaxNode => {
        if (child.type === 'text' && child.content) {
            // Return a new object instead of mutating
            return { ...child, content: child.content.trim() };
        }
        return child;
    }).filter((child: SpintaxNode): boolean => !(child.type === 'text' && !child.content)); // Filter empty text nodes

    // Simplify: if only one text child and no main content, move text to content.
    if (!option.content && option.children.length === 1 && option.children[0].type === 'text') {
        option.content = option.children[0].content;
        option.children = []; // Clear children array
    }

    // Remove final empty text nodes if content exists
    if (option.content && option.children.length > 0) {
        const lastChild = option.children[option.children.length - 1];
        if (lastChild.type === 'text' && !lastChild.content) {
            option.children.pop(); // Remove last child if it's an empty text node
        }
    }

    return option;
};


// Helper to parse a choice block '{...}'
// Return type indicates possibility of null if parsing fails or results in empty choice
const parseChoice = (str: string, startIndex: number): { choiceNode: ChoiceNode | null; endIndex: number } => {
    // Check for invalid start index or character
    if (startIndex >= str.length - 1 || str[startIndex] !== '{') {
        return { choiceNode: null, endIndex: startIndex + 1 };
    }

    // Explicitly type the choice object
    const choice: ChoiceNode = { type: 'choice', children: [] };
    let i = startIndex + 1; // Move past '{'
    let optionStartIndex = i;
    let braceDepth = 1; // Start inside the choice's braces

    while (i < str.length) {
        const char = str[i];
        let processedChar = false;

        if (char === '{') {
            braceDepth++;
        } else if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) { // Correctly matched closing brace
                const optionNode = parseOptionContent(str, optionStartIndex, i);
                // Only push if parseOptionContent succeeded
                if (optionNode) choice.children.push(optionNode);
                i++; // Move past '}'
                processedChar = true;
                break; // Choice parsing finished
            } else if (braceDepth < 0) {
                // Malformed - more closing than opening braces
                console.warn("Malformed spintax: Unexpected '}' at index", i);
                const optionNode = parseOptionContent(str, optionStartIndex, i); // Parse what we have
                if (optionNode) choice.children.push(optionNode);
                // Don't increment i here, let the outer loop handle or break correctly
                processedChar = true;
                break; // Exit loop due to error
            }
        } else if (char === '|' && braceDepth === 1) { // Option separator at the correct level
            const optionNode = parseOptionContent(str, optionStartIndex, i);
            if (optionNode) choice.children.push(optionNode);
            i++; // Move past '|'
            optionStartIndex = i; // Start next option
            processedChar = true;
        }

        if (!processedChar) {
             i++;
        }
    }

    // Handle unterminated choice (reached end of string before closing brace)
    if (braceDepth !== 0 && i === str.length) {
        console.warn("Malformed spintax: Unterminated choice starting at index", startIndex);
        // Parse the remaining part as the last option
        if (i > optionStartIndex) {
            const optionNode = parseOptionContent(str, optionStartIndex, i);
            if (optionNode) choice.children.push(optionNode);
        }
        // The endIndex will be str.length
    }

    // If parsing finished correctly (braceDepth is 0) but no children were added (e.g., "{}"),
    // return the empty choice node. If parsing failed (braceDepth != 0), return null.
    const success = braceDepth === 0;

    // Return the choiceNode if parsing was successful, otherwise null
    return { choiceNode: success ? choice : null, endIndex: i };
};


// Main parsing function - entry point
const parseSpintax = (text: string | null | undefined): RootNode => {
    // Initialize root node with correct type
    const rootNode: RootNode = { type: 'root', children: [] };
    if (typeof text !== 'string' || !text) {
        return rootNode; // Return empty root if input is invalid
    }

    const sourceText = text.trim(); // Use sourceText instead of trimmedText
    let currentIndex = 0;

    while (currentIndex < sourceText.length) {
        // Find next '{'
        const nextBrace = sourceText.indexOf('{', currentIndex);

        if (nextBrace === -1) {
            // No more choices, add remaining text
            const remainingText = sourceText.substring(currentIndex).replace(/\r\n|\r|\n/g, ' ');
            if (remainingText) {
                // Ensure pushed object matches TextNode type
                rootNode.children.push({ type: 'text', content: remainingText });
            }
            currentIndex = sourceText.length; // End loop
        } else {
            // Add text before the choice if any
            if (nextBrace > currentIndex) {
                const textBefore = sourceText.substring(currentIndex, nextBrace).replace(/\r\n|\r|\n/g, ' ');
                if (textBefore) {
                     // Ensure pushed object matches TextNode type
                    rootNode.children.push({ type: 'text', content: textBefore });
                }
            }

            // Parse the choice
            const choiceResult = parseChoice(sourceText, nextBrace); // Use sourceText
            if (choiceResult?.choiceNode) {
                // Push the valid ChoiceNode only if it's not empty (or handle empty choices as needed)
                if (choiceResult.choiceNode.children.length > 0) {
                   rootNode.children.push(choiceResult.choiceNode);
                } else {
                   // Optionally handle empty choices {} differently, e.g., skip or represent as text
                   console.warn(`Empty choice block found starting at index ${nextBrace}. Skipping.`);
                }
                currentIndex = choiceResult.endIndex;
            } else {
                // Handle error or malformed: treat '{' as literal text
                console.warn(`Malformed spintax or parsing failed starting at index ${nextBrace}. Treating '{' as literal.`);
                rootNode.children.push({ type: 'text', content: '{' });
                currentIndex = nextBrace + 1; // Move past the problematic '{'
            }
        }
    }
    return rootNode;
};


// Generate Spintax string from a node tree
const generateSpintax = (node: SpintaxNode | null | undefined): string => {
  if (!node) return '';

  switch (node.type) {
    case 'text':
      return node.content || ''; // Return content or empty string

    case 'option':
      // Recursively generate content for children and join them
      const childContent = node.children.map(child => generateSpintax(child)).join('');
      // Prepend the option's own content
      return (node.content || '') + childContent;

    case 'choice':
      if (!node.children || node.children.length === 0) return '{}'; // Represent empty choice
      // Recursively generate content for each option
      const options = node.children.map(child => generateSpintax(child));
      // Join options with '|' and wrap in braces
      return `{${options.join('|')}}`;

    case 'root':
      // Recursively generate content for children and join them
      return node.children.map(child => generateSpintax(child)).join('');

    default:
      // This case should be unreachable with discriminated unions if types are correct
      // const exhaustiveCheck: never = node; // This line can cause TS errors if node isn't truly 'never'
      console.warn("generateSpintax encountered unknown node type"); // Avoid accessing node properties here
      return '';
  }
};


// Generate a random variant from a node tree
const generateRandomVariant = (node: SpintaxNode | null | undefined): string => {
  if (!node) return '';

  switch (node.type) {
    case 'text':
      return node.content || '';

    case 'option':
      // Generate content for children recursively and prepend own content
      const childContentOption = node.children.map(child => generateRandomVariant(child)).join('');
      return (node.content || '') + childContentOption;

    case 'choice':
      // Handle empty choice
      if (!node.children || node.children.length === 0) return '';
      // Select a random option
      const randomIndexChoice = Math.floor(Math.random() * node.children.length);
      const chosenOptionChoice = node.children[randomIndexChoice];
      // Generate variant from the chosen option
      return chosenOptionChoice ? generateRandomVariant(chosenOptionChoice) : '';

    case 'root':
      // Generate variant for each child and join
      return node.children.map(child => generateRandomVariant(child)).join('');

    default:
      // This case should be unreachable with discriminated unions if types are correct
      // const exhaustiveCheckRandom: never = node; // This line can cause TS errors if node isn't truly 'never'
      console.warn("generateRandomVariant encountered unknown node type"); // Avoid accessing node properties here
      return '';
  }
};


// Calculate the total number of unique variations
const calculateVariations = (node: SpintaxNode | null | undefined): number | typeof Infinity => {
  // Base case: null or undefined node contributes 1 variation (empty string)
  if (!node) return 1;

  // Limit to prevent performance issues with deeply nested or large spintax
  const MAX_VARIATIONS = 1000000;

  try {
    switch (node.type) {
      case 'text':
        // Text node represents a single path
        return 1;

      case 'option':
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

      case 'choice':
        // Variations for a choice are additive across its options
        let choiceVariations = 0;
        if (!node.children || node.children.length === 0) {
            return 1; // An empty choice {} still counts as one path (empty string result)
        }
        for (const child of node.children) {
            const optionVars = calculateVariations(child);
             // Handle Infinity propagation
            if (optionVars === Infinity) return Infinity;
            choiceVariations += optionVars;
            // Check for overflow
            if (choiceVariations > MAX_VARIATIONS) return Infinity;
        }
        // If total is 0 (e.g., choice contains only empty options), it still represents 1 path.
        return choiceVariations === 0 ? 1 : choiceVariations;

      case 'root':
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
         // This case should be unreachable with discriminated unions if types are correct
         // const exhaustiveCheckCalc: never = node; // This line can cause TS errors if node isn't truly 'never'
         console.warn("calculateVariations encountered unknown node type"); // Avoid accessing node properties here
         return 1; // Treat unknown as 1 variation
    }
  } catch (error: unknown) { // Catch unknown error type
      // Catch potential errors during calculation (e.g., stack overflow for extreme nesting)
      console.error("Error calculating variations:", error);
      return Infinity; // Return Infinity on error
  }
};


// --- NodeEditor Component ---
// Define Props interface
interface NodeEditorProps {
  node: SpintaxNode | null; // Node can be null initially or on error
  path: SpintaxPath;
  updateNode: (path: SpintaxPath, newNodeOrFn: SpintaxNode | ((currentNode: SpintaxNode | null) => SpintaxNode | null)) => void;
  deleteNode: (path: SpintaxPath) => void;
  addNode: (path: SpintaxPath, newNode: SpintaxNode) => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, path, updateNode, deleteNode, addNode }) => {
  // --- State Hooks ---
  // Hooks MUST be called unconditionally at the top level
  const [isExpanded, setIsExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);
  // Initialize editContent based on node?.content, handle cases where node might be null initially
  const [editContent, setEditContent] = useState((node && 'content' in node) ? node.content : '');

  // --- Effects ---
  // Effect to update editContent state when the node's content prop changes externally
  useEffect(() => {
    // Check if node exists and has a 'content' property before accessing it
    if (node && 'content' in node) {
        setEditContent(node.content ?? ''); // Update local state if prop changes
    } else {
        setEditContent(''); // Reset if node has no content property or node is null
    }
  }, [node]); // Rerun when the node prop changes

  // --- Early return for null node (AFTER hooks) ---
  if (!node) {
    return <div className="p-2 my-1 bg-red-100 text-red-800 rounded text-xs">Error: Missing node data</div>;
  }

  // --- Event Handlers ---
  const handleToggle = () => setIsExpanded(!isExpanded);

  const handleEdit = () => {
    // Set edit content from the current node state before entering edit mode
    if ('content' in node) { // Check if node has content property
        setEditContent(node.content ?? '');
    }
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    // Optionally reset editContent to original node content on cancel
    if ('content' in node) {
        setEditContent(node.content ?? '');
    }
  };

  const handleDelete = () => deleteNode(path); // Call prop function

  const handleSave = () => {
    // Only save if the node exists and has a content property
    if ('content' in node) {
       // Call updateNode prop with the path and the modified node
       // Ensure the spread node retains its original type
       updateNode(path, { ...node, content: editContent });
    }
    setEditMode(false); // Exit edit mode
  };

  // --- Add Action Handlers ---
  // These handlers create new nodes and call the addNode prop function
  const handleAddOption = () => {
    // Ensure the current node is a Choice node before adding an option
    if (node.type !== 'choice') return;
    const newOption: OptionNode = { type: 'option', content: '', children: [] };
    // Calculate path for the new node (append to children array)
    const newPath: SpintaxPath = [...path, 'children', node.children.length];
    addNode(newPath, newOption);
  };

  const handleAddChoice = () => {
     // Ensure the current node is an Option node before adding a choice inside it
    if (node.type !== 'option') return;
    const newChoice: ChoiceNode = { type: 'choice', children: [{ type: 'option', content: 'A', children: [] }, { type: 'option', content: 'B', children: [] }] };
    const newPath: SpintaxPath = [...path, 'children', node.children.length];
    addNode(newPath, newChoice);
  };

  const handleAddText = () => {
     // Ensure the current node is an Option node before adding text inside it
    if (node.type !== 'option') return;
    const newText: TextNode = { type: 'text', content: 'new text' };
    const newPath: SpintaxPath = [...path, 'children', node.children.length];
    addNode(newPath, newText);
  };


  // --- Reorder Handlers ---
  const handleMoveUp = () => {
    if (!path || path.length < 2) return; // Need at least parent prop and index

    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number; // Last element is index

    if (currentIndex <= 0) return; // Already at the top

    // Use the updateNode prop passed from the parent, providing an updater function
    updateNode(parentPath, (parentNode: SpintaxNode | null) => {
      // Check if parentNode is valid and has children
      if (!parentNode || !('children' in parentNode) || !Array.isArray(parentNode.children)) {
          console.error("Cannot move up: Invalid parent node or no children array.", parentNode);
          return parentNode; // Return unchanged parent on error
      }

      // Ensure index is within bounds
      if (currentIndex >= parentNode.children.length) {
          console.error("Cannot move up: Index out of bounds.", currentIndex, parentNode.children.length);
          return parentNode;
      }

      const newChildren = [...parentNode.children];
      const [removed] = newChildren.splice(currentIndex, 1); // Remove item
      newChildren.splice(currentIndex - 1, 0, removed); // Insert item one position earlier

      // Return the parent node with the updated children array
      // Need to handle different parent types potentially
      if (parentNode.type === 'root') {
          return { ...parentNode, children: newChildren as (TextNode | ChoiceNode)[] };
      } else if (parentNode.type === 'option') {
          return { ...parentNode, children: newChildren as (TextNode | ChoiceNode)[] };
      } else if (parentNode.type === 'choice') {
          return { ...parentNode, children: newChildren as OptionNode[] };
      }
      // Should not happen if structure is correct, but return unchanged as fallback
      console.error("Cannot move up: Unexpected parent node type.");
      return parentNode;
    });
  };

  const handleMoveDown = () => {
    if (!path || path.length < 2) return;

    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number;

    // Use updateNode with an updater function
    updateNode(parentPath, (parentNode: SpintaxNode | null) => {
       if (!parentNode || !('children' in parentNode) || !Array.isArray(parentNode.children)) {
           console.error("Cannot move down: Invalid parent node or no children array.", parentNode);
           return parentNode;
       }

       if (currentIndex < 0 || currentIndex >= parentNode.children.length - 1) {
           // Already at the bottom or invalid index
           return parentNode;
       }

       const newChildren = [...parentNode.children];
       const [removed] = newChildren.splice(currentIndex, 1);
       newChildren.splice(currentIndex + 1, 0, removed); // Insert one position later

       if (parentNode.type === 'root') {
          return { ...parentNode, children: newChildren as (TextNode | ChoiceNode)[] };
       } else if (parentNode.type === 'option') {
          return { ...parentNode, children: newChildren as (TextNode | ChoiceNode)[] };
       } else if (parentNode.type === 'choice') {
          return { ...parentNode, children: newChildren as OptionNode[] };
       }
       console.error("Cannot move down: Unexpected parent node type.");
       return parentNode;
    });
  };


  // --- Helper Functions (// TODO: move outside component or passing info via props) ---

  // NOTE: getParentNode and functions relying on it (shouldShowOrderControls, needsTextBetween)
  // are problematic as implemented. They require knowledge of the entire tree structure,
  // breaking component encapsulation. These features should be refactored to rely on
  // information passed down as props (e.g., parentType, previousSiblingType, isFirstChild, isLastChild).
  // For now, simplifying the logic to avoid runtime errors and removing unused helpers.

  const getIndex = (): number | null => {
      if (path.length >= 2) {
          return path[path.length - 1] as number;
      }
      return null;
  };

  // Simplified version - show controls unless it's the root
  const shouldShowOrderControls = (): boolean => path.length > 0;

  // Simplified version - always false until refactored with proper sibling info
  const needsTextBetween = (): boolean => false; // Requires previousSiblingType prop

  const handleInsertTextBefore = () => {
    if (!path || path.length < 2) return;
    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1] as number;
    const newText: TextNode = { type: 'text', content: ' ' };
    const insertPath: SpintaxPath = [...parentPath, 'children', currentIndex];
    addNode(insertPath, newText);
  };

  // --- Node Styling and Structure ---
  const getNodeColor = (): string => {
    // node is guaranteed to be non-null here due to early return
    switch (node.type) {
      case 'root': return 'bg-gray-100';
      case 'choice': return 'bg-blue-100';
      case 'option': return 'bg-green-100';
      case 'text': return 'bg-yellow-100';
      default: return 'bg-red-100'; // Error case
    }
  };

  // Determine if the node type can logically have children according to types
  const canHaveChildren = node.type === 'root' || node.type === 'choice' || node.type === 'option';
  // Check if children array exists and is not empty
  const hasChildren = canHaveChildren && 'children' in node && Array.isArray(node.children) && node.children.length > 0;
  const showOrderControls = shouldShowOrderControls(); // Use the simplified helper
  const nodeIndex = getIndex(); // Get current node's index


  return (
    <div className={`rounded p-2 mb-1 ${getNodeColor()} border border-gray-300`}>
      {/* Warning for consecutive choices (currently disabled due to unreliable detection) */}
      {needsTextBetween() && (
        <div className="mb-1 bg-orange-100 rounded p-1 flex justify-center">
          <button
            onClick={handleInsertTextBefore}
            className="text-xs text-orange-800 flex items-center px-2 py-0.5 bg-orange-200 rounded hover:bg-orange-300"
            title="Add text between choices">
            <Plus size={10} className="mr-1" /> Insert Text
          </button>
        </div>
      )}

      {/* Node Header Row */}
      <div className="flex items-center space-x-2">
        {/* Toggle Expansion Button */}
        <div className="w-4 flex-shrink-0">
         {/* Only show toggle if the node type can have children AND it actually has children */}
         {canHaveChildren && hasChildren && (
           <button onClick={handleToggle} className="focus:outline-none text-gray-500 hover:text-gray-800" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
             {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
           </button>
         )}
        </div>

        {/* Content / Type Display Area */}
        <div className="flex-1 min-w-0">
          {/* Edit Mode Input */}
          {editMode && (node.type === 'text' || node.type === 'option') ? (
             <div className="flex items-center space-x-2">
              <input
                  type="text"
                  value={editContent}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditContent(e.target.value)}
                  className="flex-1 p-1 border rounded bg-white text-sm"
                  autoFocus
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                  aria-label="Edit node content"
              />
              <button onClick={handleSave} className="p-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">Save</button>
              <button onClick={handleCancel} className="p-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">Cancel</button>
            </div>
          ) : (
            // Display Mode
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-600 uppercase w-16 flex-shrink-0">{node.type}</span>
              {(node.type === 'text' || node.type === 'option') ? (
                // Display content for Text/Option nodes
                <span
                    className="cursor-pointer hover:bg-gray-200/50 px-1 py-0.5 rounded flex-1 break-words min-w-0 text-sm"
                    onClick={handleEdit}
                    title="Click to edit"
                >
                  {/* Display content or placeholder */}
                  {node.content ? node.content : <span className="italic text-gray-400">empty text</span>}
                </span>
              ) : (
                 // Display info for Choice/Root nodes
                 <span className="p-1 text-sm text-gray-700">
                    {node.type === 'choice' ? `${node.children?.length ?? 0} options` : ''}
                    {/* Root node doesn't need specific info here */}
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
              disabled={nodeIndex === null || nodeIndex <= 0} // Disable if first item or index unknown
            >
              <ArrowUp size={12} />
            </button>
            <button
              onClick={handleMoveDown}
              className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Move Down"
              // Disable move down needs knowledge of sibling count (parent.children.length).
              // This info isn't readily available without passing it down.
              // The handler function `handleMoveDown` already checks bounds internally.
              // disabled={nodeIndex === null || nodeIndex >= (parentNode?.children?.length ?? 1) - 1} // Requires parentNode access
            >
              <ArrowDown size={12} />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-1 flex-shrink-0">
           {/* Edit button */}
           {(node.type === 'text' || node.type === 'option') && !editMode && (
             <button onClick={handleEdit} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Edit Content">
               <Pencil size={14} />
             </button>
           )}
           {/* Delete button */}
          {node.type !== 'root' && (
            <button onClick={handleDelete} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Delete Node">
              <Trash2 size={14} />
            </button>
          )}
           {/* Add Option button (for Choice nodes) */}
          {node.type === 'choice' && (
            <button onClick={handleAddOption} className="p-1 text-green-500 hover:bg-green-100 rounded flex items-center" title="Add Option">
              <Plus size={14} /> <span className="text-xs ml-0.5">Opt</span>
            </button>
          )}
           {/* Add Text/Choice buttons (for Option nodes) */}
          {node.type === 'option' && (
            <>
              <button onClick={handleAddText} className="p-1 text-yellow-600 hover:bg-yellow-100 rounded flex items-center" title="Add Text Node inside Option">
                <Plus size={14} /> <span className="text-xs ml-0.5">Txt</span>
              </button>
              <button onClick={handleAddChoice} className="p-1 text-blue-500 hover:bg-blue-100 rounded flex items-center" title="Add Choice Node inside Option">
                <Plus size={14} /> <span className="text-xs ml-0.5">Choice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Children Area - Render recursively */}
      {/* Only render if expanded and the node can and does have children */}
      {isExpanded && canHaveChildren && hasChildren && (
        <div className="pl-6 mt-1 border-l-2 border-gray-300 ml-2">
          {/* Map over the children array */}
          {node.children.map((child, index) => (
            <NodeEditor
              // Use a more stable key if possible, e.g., if nodes had unique IDs
              key={index}
              node={child}
              // Construct the path for the child node
              path={[...path, 'children', index]}
              // Pass down the callback functions
              updateNode={updateNode}
              deleteNode={deleteNode}
              addNode={addNode}
              // TODO: Pass necessary parent/sibling info as props for reliable controls
              // e.g., parentType={node.type} isFirstChild={index === 0} isLastChild={index === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// --- SpintaxEditorTab Component ---
// Define Props interface
interface SpintaxEditorTabProps {
  initialSpintax?: string;
  onUpdate?: (newSpintax: string) => void;
}

const SpintaxEditorTab: React.FC<SpintaxEditorTabProps> = ({ initialSpintax = '', onUpdate }) => {
  // State Hooks with types
  const [spintaxTree, setSpintaxTree] = useState<RootNode>(() => {
     try { return parseSpintax(initialSpintax); }
     catch (e) {
       console.error("Initial parse error:", e);
       return { type: 'root', children: [] };
     }
  });
  const [outputText, setOutputText] = useState<string>('');
  const [randomPreview, setRandomPreview] = useState<string>('');
  const [variationCount, setVariationCount] = useState<number | typeof Infinity>(() => {
      try {
         const initialTree = parseSpintax(initialSpintax); // Use prop directly
         const vars = calculateVariations(initialTree);
         return vars === Infinity ? Infinity : (typeof vars === 'number' ? vars : 0);
      } catch(e) {
        console.error("Initial variation calculation error:", e);
        return 0;
      }
  });
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'export'>('editor');
  const [parseError, setParseError] = useState<string | null>(null); // Allow null for no error

  // Effect to re-parse when initialSpintax prop changes
  useEffect(() => {
    try {
      setParseError(null); // Clear previous error
      const tree = parseSpintax(initialSpintax);
      setSpintaxTree(tree);
      setRandomPreview(''); // Reset preview on new initial spintax
      setOutputText(generateSpintax(tree));
      const vars = calculateVariations(tree);
      setVariationCount(vars === Infinity ? Infinity : (typeof vars === 'number' ? vars : 0));
    } catch (error: unknown) { // Catch unknown error type
      console.error("Error parsing spintax in useEffect:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error during parsing";
      setParseError(`Error parsing spintax: ${errorMsg}`); // Set string error message
      setSpintaxTree({ type: 'root', children: [] });
      setOutputText('');
      setVariationCount(0);
    }
  }, [initialSpintax]);

  // Effect to update output text, variation count, and call onUpdate when the tree changes
  useEffect(() => {
    if (!spintaxTree) {
      setOutputText('');
      setVariationCount(0);
      return;
    }

    let currentOutput = '';
    let currentVariationsResult: number | typeof Infinity = 0;
    let errorOccurred = false;

    try {
      currentOutput = generateSpintax(spintaxTree);
    } catch (error: unknown) { // Catch unknown error type
      console.error("Error generating spintax:", error);
      currentOutput = `<Error generating spintax: ${error instanceof Error ? error.message : 'Unknown error'}>`;
      errorOccurred = true;
    }

    try {
      currentVariationsResult = calculateVariations(spintaxTree);
      setVariationCount(currentVariationsResult === Infinity ? Infinity : (typeof currentVariationsResult === 'number' ? currentVariationsResult : 0));
    } catch (error: unknown) { // Catch unknown error type
       console.error("Error calculating variations:", error);
       const isOverflow = error instanceof Error && error.message === "Overflow";
       setVariationCount(isOverflow ? Infinity : 0);
       errorOccurred = true;
    }

    setOutputText(currentOutput);

    // Avoid calling onUpdate if an error occurred during generation/calculation
    if (onUpdate && !errorOccurred) {
       let initialOutputFromProp = '';
       try {
         initialOutputFromProp = generateSpintax(parseSpintax(initialSpintax || ''));
       } catch { /* Ignore parse error of initial prop here */ }

       if (currentOutput !== initialOutputFromProp) {
         onUpdate(currentOutput);
       }
    }
  }, [spintaxTree, onUpdate, initialSpintax]);


  // Helper to get a node by path (used in updateNode, memoized separately)
  const getNodeByPath = useCallback((tree: RootNode | null, nodePath: SpintaxPath): SpintaxNode | null => {
    if (!tree || !nodePath) return null;
    if (nodePath.length === 0) return tree;

    let current: SpintaxNode | null = tree;
    try {
      for (let i = 0; i < nodePath.length; i += 2) {
        const prop = nodePath[i] as keyof (OptionNode | ChoiceNode | RootNode);
        const index = nodePath[i+1] as number;

        // Type guard to ensure 'current' has the property 'prop' before accessing it dynamically
        if (!current || !(prop in current)) {
            console.error("Invalid path segment in getNodeByPath: Property missing.", prop, "in node", current);
            return null;
        }
        // Cast to unknown first for safer dynamic access
        const childrenArray = (current as unknown as { [key: string]: unknown })[prop];

        if (!Array.isArray(childrenArray) || childrenArray.length <= index || index < 0) {
           console.error("Invalid path segment in getNodeByPath: Index out of bounds or not an array.", prop, index, "in node", current);
           return null;
        }
        current = childrenArray[index] as SpintaxNode; // Assert type after validation
      }
      return current;
    } catch (e) {
      console.error("Error in getNodeByPath:", e, "Path:", nodePath);
      return null;
    }
  }, []);


  // Memoized callbacks for NodeEditor
  const updateNode = useCallback((path: SpintaxPath, newNodeOrFunction: SpintaxNode | ((currentNode: SpintaxNode | null) => SpintaxNode | null)) => {
    setSpintaxTree((prevTree: RootNode): RootNode => { // prevTree is RootNode, returns RootNode
      // No need to check !prevTree here as the state type is RootNode
      try {
        // Deep clone to avoid mutation issues
        const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;

        const currentNodeSnapshot = typeof newNodeOrFunction === 'function'
            ? getNodeByPath(newTree, path)
            : null;

        const newNode = typeof newNodeOrFunction === 'function'
          ? newNodeOrFunction(currentNodeSnapshot)
          : newNodeOrFunction;

        if (!newNode) {
            console.warn("Update function returned null, aborting update for path:", path);
            return prevTree;
        }

        if (path.length === 0) {
           if (newNode.type === 'root') {
               return newNode;
           } else {
               console.error("Attempted to replace root node with a non-root node:", newNode.type);
               return prevTree;
           }
        }

        const parentPath = path.slice(0, -2);
        let parent: SpintaxNode | null = newTree;
        for (let i = 0; i < parentPath.length; i += 2) {
           const prop = parentPath[i] as keyof SpintaxNode; // More general keyof
           const index = parentPath[i+1] as number;

            if (!parent || !(prop in parent)) {
                throw new Error(`Invalid parent path segment during update: Property ${prop} missing`);
            }
            // Cast to unknown first for safer dynamic access
            const childrenArray = (parent as unknown as { [key: string]: unknown })[prop];
            if (!Array.isArray(childrenArray) || childrenArray.length <= index || index < 0) {
                throw new Error(`Invalid parent path segment during update: Index ${index} out of bounds for ${prop}`);
            }
           parent = childrenArray[index] as SpintaxNode;
        }

        const parentProperty = path[path.length - 2]; // Keep as string | number initially
        const nodeIndex = path[path.length - 1] as number;

        // Check if the property is 'children' and the parent is of a type that can have children
        if (parent && parentProperty === 'children' && (parent.type === 'root' || parent.type === 'choice' || parent.type === 'option')) {
            // Now TypeScript knows parent has a 'children' array
            if (Array.isArray(parent.children) && parent.children.length > nodeIndex && nodeIndex >= 0) {
                parent.children[nodeIndex] = newNode;
                return newTree;
            } else {
                 console.error("Invalid target for update: Index out of bounds.", "Parent:", parent, "Property:", parentProperty, "Index:", nodeIndex);
                 throw new Error(`Invalid target location for node update: Index out of bounds`);
            }
        } else {
          console.error("Invalid target for update:", "Parent:", parent, "Property:", parentProperty, "Index:", nodeIndex, "Parent Children:", parent && 'children' in parent ? parent.children : 'N/A');
          throw new Error(`Invalid target location for node update`);
        }
      } catch (error: unknown) { // Catch unknown error type
        console.error("Update node failed:", error, "Path:", path, "Update:", newNodeOrFunction);
        return prevTree;
      }
    });
  }, [getNodeByPath]); // Include getNodeByPath dependency


  const deleteNode = useCallback((path: SpintaxPath) => {
    if (!path || path.length < 2) {
        console.warn("Attempted to delete root node or invalid path:", path);
        return;
    }
    setSpintaxTree((prevTree: RootNode): RootNode => { // prevTree is RootNode, returns RootNode
       // No need to check !prevTree
       try {
        const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;
        let parent: SpintaxNode | null = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
            const prop = path[i] as keyof SpintaxNode;
            const index = path[i+1] as number;
            if (!parent || !(prop in parent)) {
                 throw new Error(`Invalid path segment during delete navigation: Property ${prop} missing`);
            }
             // Cast to unknown first for safer dynamic access
            const childrenArray = (parent as unknown as { [key: string]: unknown })[prop];
            if (!Array.isArray(childrenArray) || childrenArray.length <= index || index < 0) {
                throw new Error(`Invalid path segment during delete navigation: Index ${index} out of bounds for ${prop}`);
            }
            parent = childrenArray[index] as SpintaxNode;
        }

        const parentProperty = path[path.length - 2]; // Keep as string | number initially
        const nodeIndex = path[path.length - 1] as number;

        // Check if the property is 'children' and the parent is of a type that can have children
        if (parent && parentProperty === 'children' && (parent.type === 'root' || parent.type === 'choice' || parent.type === 'option')) {
             // Now TypeScript knows parent has a 'children' array
             if (Array.isArray(parent.children) && parent.children.length > nodeIndex && nodeIndex >= 0) {
                parent.children.splice(nodeIndex, 1);
                return newTree;
             } else {
                 console.error("Invalid target for delete: Index out of bounds.", "Parent:", parent, "Property:", parentProperty, "Index:", nodeIndex);
                 throw new Error(`Invalid target location for node deletion: Index out of bounds`);
             }
        } else {
            console.error("Invalid target for delete:", "Parent:", parent, "Property:", parentProperty, "Index:", nodeIndex, "Parent Children:", parent && 'children' in parent ? parent.children : 'N/A');
            throw new Error(`Invalid target location for node deletion`);
        }
       } catch (error: unknown) { // Catch unknown error type
           console.error("Delete node failed:", error, "Path:", path);
           return prevTree;
       }
    });
  }, []);

  const addNode = useCallback((path: SpintaxPath, newNode: SpintaxNode) => {
    if (!path || path.length < 2 || !newNode) { // Path must have at least ['children', index]
        console.warn("Invalid arguments for addNode:", "Path:", path, "Node:", newNode);
        return;
    }
    setSpintaxTree((prevTree: RootNode): RootNode => { // prevTree is RootNode, returns RootNode
       // No need to check !prevTree
       try {
        const newTree = JSON.parse(JSON.stringify(prevTree)) as RootNode;
        let parent: SpintaxNode | null = newTree;

        // Navigate to the parent node
        for (let i = 0; i < path.length - 2; i += 2) {
            const prop = path[i] as keyof SpintaxNode;
            const index = path[i+1] as number;
             if (!parent || !(prop in parent)) {
                 throw new Error(`Invalid path segment during add navigation: Property ${prop} missing`);
             }
              // Cast to unknown first for safer dynamic access
             const childrenArray = (parent as unknown as { [key: string]: unknown })[prop];
             if (!Array.isArray(childrenArray) || childrenArray.length <= index || index < 0) {
                throw new Error(`Invalid path segment during add navigation: Index ${index} out of bounds for ${prop}`);
            }
            parent = childrenArray[index] as SpintaxNode;
        }

        const parentProperty = path[path.length - 2]; // Keep as string | number initially
        const targetIndex = path[path.length - 1] as number;

        // Add to the parent's children array
        // Check if the property is 'children' and the parent is of a type that can have children
        if (parent && parentProperty === 'children' && (parent.type === 'root' || parent.type === 'choice' || parent.type === 'option')) {
             // Now TypeScript knows parent has a 'children' array
             if (Array.isArray(parent.children)) {
                 const validIndex = Math.max(0, Math.min(targetIndex, parent.children.length));
                 parent.children.splice(validIndex, 0, newNode);
                 return newTree;
             } else {
                 // This case should ideally not be reached if parent types are correct
                 console.error("Invalid target for add: Parent children is not an array.", "Parent:", parent, "Property:", parentProperty, "Index:", targetIndex);
                 throw new Error(`Invalid target location for node addition: Children not an array`);
             }
        } else {
             console.error("Invalid target for add:", "Parent:", parent, "Property:", parentProperty, "Index:", targetIndex, "Parent Children:", parent && 'children' in parent ? parent.children : 'N/A');
             throw new Error(`Invalid target location for node addition`);
        }
       } catch(error: unknown) { // Catch unknown error type
         console.error("Add node failed:", error, "Path:", path, "Node:", newNode);
         return prevTree;
       }
    });
  }, []);

  // Other handlers
  const generatePreview = useCallback(() => {
    try {
      if (!spintaxTree) { setRandomPreview(''); return; }
      const preview = generateRandomVariant(spintaxTree);
      setRandomPreview(preview);
    } catch (error: unknown) { // Catch unknown error type
        console.error("Error generating preview:", error);
        setRandomPreview(`<Error generating preview: ${error instanceof Error ? error.message : 'Unknown error'}>`);
    }
  }, [spintaxTree]);

  const handleCopyOutput = () => {
    // TODO: Consider providing a user-facing error message or UI feedback
    // when clipboard copy fails instead of only logging the error, to enhance user clarity.
      navigator.clipboard.writeText(outputText).catch(err => {
          console.error("Failed to copy output text:", err);
      });
  };
  const handleClearAll = () => {
      setSpintaxTree({ type: 'root', children: [] });
      setParseError(null); // Also clear parse error
  };

  // Format variation count for display
  const displayVariationCount = variationCount === Infinity ? 'Overflow (>1M)' : variationCount.toLocaleString();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Tabs Navigation */}
      <div className="flex border-b bg-gray-50 flex-shrink-0">
         <button className={`px-4 py-2 text-sm ${activeTab === 'editor' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => setActiveTab('editor')}> <Pencil size={16} className="inline mr-1 mb-0.5" /> Editor </button>
         <button className={`px-4 py-2 text-sm ${activeTab === 'preview' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => { setActiveTab('preview'); generatePreview(); }}> <Eye size={16} className="inline mr-1 mb-0.5" /> Preview </button>
         <button className={`px-4 py-2 text-sm ${activeTab === 'export' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => setActiveTab('export')}> <FileText size={16} className="inline mr-1 mb-0.5" /> Export </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Editor Actions Bar */}
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-wrap flex-shrink-0">
               <div className="flex space-x-2 items-center mb-1 sm:mb-0">
                 <span className="text-sm font-medium mr-2">Add to Root:</span>
                 {/* Add Text Node Button */}
                 <button onClick={() => addNode(['children', spintaxTree?.children?.length ?? 0], { type: 'text', content: 'new text' })} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-xs flex items-center" title="Add Text block at the end of the root level"> <Plus size={12} className="mr-1" /> Text </button>
                 {/* Add Choice Node Button */}
                 <button onClick={() => addNode(['children', spintaxTree?.children?.length ?? 0], { type: 'choice', children: [{ type: 'option', content: 'A', children: [] }, { type: 'option', content: 'B', children: [] }] })} className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs flex items-center" title="Add Choice block {A|B} at the end of the root level"> <Plus size={12} className="mr-1" /> Choice </button>
               </div>
               {/* Clear All Button */}
               <button onClick={handleClearAll} className="px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs flex items-center" title="Clear the entire editor content"> <Trash2 size={12} className="mr-1" /> Clear All </button>
             </div>
            {/* Editor Tree View Area */}
             <div className="flex-1 overflow-auto p-2 bg-white">
               {/* Display Parsing Error if exists */}
               {parseError ? (
                  <div className="p-4 my-2 text-red-700 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center mb-1"><AlertCircle size={18} className="mr-2 text-red-600" /><p className="font-semibold">Spintax Parsing Error</p></div>
                    <p className="text-sm">{parseError}</p><p className="text-xs mt-2 text-gray-600">Editor may be empty or showing partial structure. Please check the input spintax.</p>
                  </div>
               ) : (
                 // Render the NodeEditor for the root node if no parse error
                 <div className="border rounded p-2 bg-gray-50 min-h-full">
                    {spintaxTree ? (
                        <NodeEditor node={spintaxTree} path={[]} updateNode={updateNode} deleteNode={deleteNode} addNode={addNode}/>
                    ) : (
                         // Should ideally not happen if state is initialized correctly
                         <p className="text-center text-gray-400 italic p-4">Loading editor...</p>
                    )}
                    {/* Show placeholder if tree is empty and no error */}
                    {(!spintaxTree || !spintaxTree.children || spintaxTree.children.length === 0) && !parseError && (
                      <p className="text-center text-gray-400 italic p-4">{"Editor is empty. Use 'Add to Root' buttons to start."}</p>
                    )}
                 </div>
               )}
             </div>

            {/* Current Spintax Display Footer */}
            <div className="p-2 border-t bg-gray-50 flex-shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Spintax:</span>
                <span className="text-sm text-gray-600">
                  Total variations: <span className="font-medium text-blue-800">{displayVariationCount}</span>
                </span>
              </div>
              {/* Display the generated spintax string */}
              <div className="mt-1 p-2 bg-white border rounded overflow-auto max-h-20">
                <pre className="text-xs font-mono whitespace-pre-wrap">{outputText || '<empty>'}</pre>
              </div>
            </div>
          </div>
        )}
        {/* Preview Tab */}
        {activeTab === 'preview' && (
           <div className="flex-1 flex flex-col">
             {/* Preview Actions Bar */}
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
               <button onClick={generatePreview} className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"> <RotateCw size={14} className="mr-1" /> Generate New Preview </button>
               <span className="text-sm text-gray-600"> Variations: {displayVariationCount} </span>
             </div>
             {/* Preview Display Area */}
             <div className="flex-1 overflow-auto p-4 bg-white">
               <div className="border rounded p-4 bg-gray-50 min-h-[100px] whitespace-pre-wrap">
                 {/* Show random preview or placeholder */}
                 {randomPreview || <span className="text-gray-400 italic">{"Click 'Generate New Preview' to see a random variation here."}</span>}
               </div>
             </div>
           </div>
        )}
        {/* Export Tab */}
        {activeTab === 'export' && (
           <div className="flex-1 flex flex-col">
             {/* Export Actions Bar */}
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
               <button onClick={handleCopyOutput} className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"> <Copy size={14} className="mr-1" /> Copy to Clipboard </button>
               <span className="text-sm text-gray-600"> Variations: {displayVariationCount} </span>
             </div>
             {/* Export Text Area */}
             <div className="flex-1 overflow-auto p-4 bg-white">
               <textarea
                 readOnly
                 value={outputText} // Display the generated spintax string
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


// --- Import/Export Modal Component ---
// Define Props interface
interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Specify the structure of the imported data
  onImport: (data: { singleSpintax?: string; yamlEntries?: YamlEntries }) => void;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose, onImport }) => {
  // State for the text area content
  const [importText, setImportText] = useState<string>(exampleSpintax);
  // State for the selected import type (radio buttons)
  const [importType, setImportType] = useState<'spintax' | 'yaml'>('spintax');
  // State for displaying errors during import - allow null
  const [error, setError] = useState<string | null>(null);

  // Handler for the main import button
  const handleImport = () => {
    try {
      setError(null); // Clear previous error before attempting import
      if (importType === 'spintax') {
        // Optional: Basic validation for spintax (e.g., check brace balance)
        let balance = 0;
        for (const char of importText) {
            if (char === '{') balance++;
            else if (char === '}') balance--;
        }
        if (balance !== 0) {
            setError("Warning: Spintax braces seem unbalanced. Importing anyway.");
        }
        onImport({ singleSpintax: importText });
      } else { // YAML import
        const entries = parseYaml(importText);
        if (!entries || Object.keys(entries).length === 0) {
          setError('No valid entries found in YAML input. Please check format.');
          return;
        }
        onImport({ yamlEntries: entries });
      }
      onClose(); // Close the modal automatically on successful import
    } catch (e: unknown) { // Catch unknown error type
      console.error("Import error:", e);
      const errorMsg = e instanceof Error ? e.message : "An unknown error occurred during import";
      setError(`Error processing ${importType}: ${errorMsg}`);
    }
  };

  // Effect to reset modal state when it opens or the import type changes
  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear error message
      setImportText(importType === 'spintax' ? exampleSpintax : exampleYaml);
    }
  }, [isOpen, importType]);


  // Don't render the modal if isOpen is false
  if (!isOpen) return null;

  // JSX for the modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Modal Content Box */}
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold">Import Content</h2>
          {/* Close Button */}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 flex-1 overflow-auto">
          {/* Import Type Selection */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:space-x-4 mb-2">
              <label className="flex items-center cursor-pointer mb-1 sm:mb-0">
                <input
                  type="radio"
                  name="importType"
                  value="spintax"
                  checked={importType === 'spintax'}
                  onChange={() => setImportType('spintax')}
                  className="mr-2"
                />
                Single Spintax
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  value="yaml"
                  checked={importType === 'yaml'}
                  onChange={() => setImportType('yaml')}
                  className="mr-2"
                />
                YAML (Multiple Entries)
              </label>
            </div>

            {/* YAML Example (Conditional) */}
            {importType === 'yaml' && (
              <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-sm rounded border border-blue-200">
                <p className="mb-1 font-medium">YAML Format Example:</p>
                <pre className="text-xs overflow-auto max-h-32 bg-white p-2 border rounded">{exampleYaml}</pre>
              </div>
            )}

            {/* Import Text Area */}
            <textarea
              value={importText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
              className="w-full h-64 p-2 border rounded font-mono text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={importType === 'spintax'
                ? 'Paste your spintax here...'
                : 'Paste your YAML content here...'}
              aria-label="Import content area"
            />
          </div>

          {/* Error Display Area */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
              {/* Optional: Add a dismiss button for the error */}
              <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t flex justify-end space-x-2 flex-shrink-0 bg-gray-50">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {/* Import Button */}
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            // Disable button if text area is empty
            disabled={!importText.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main Spintax Editor Component ---
const SpintaxEditorComponent: React.FC = () => { // Use React.FC for component type
  // State Hooks with types
  const [entries, setEntries] = useState<YamlEntries>({});
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [yamlExport, setYamlExport] = useState<string>('');
  const [showYamlExport, setShowYamlExport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // Allow null for no error

  // Handler for importing data from the modal
  const handleImport = ({ singleSpintax, yamlEntries }: { singleSpintax?: string; yamlEntries?: YamlEntries }) => {
    try {
      setError(null); // Clear previous global error
      let firstKey: string | null = null;

      if (singleSpintax !== undefined) { // Check if singleSpintax was provided
        const key = `spintax_${Date.now()}`; // Generate a unique key
        setEntries({ [key]: singleSpintax }); // Set entries to the single item
        firstKey = key;
      } else if (yamlEntries && Object.keys(yamlEntries).length > 0) {
        setEntries(yamlEntries); // Set entries from the parsed YAML
        firstKey = Object.keys(yamlEntries)[0]; // Get the first key from YAML
      } else {
         console.warn("Import handler called with no data.");
         return;
      }
      setActiveEntry(firstKey);

    } catch (err: unknown) { // Catch unknown error type
       const errorMsg = err instanceof Error ? err.message : "An unknown error occurred during import processing";
       setError(`Import processing error: ${errorMsg}`); // Set string error message
       console.error("Import handling error:", err);
    }
  };

  // Callback to update the content of the currently active entry
  const updateEntry = useCallback((value: string) => { // Type the value parameter
    if (!activeEntry) return;
    setEntries(prev => ({
      ...prev,
      [activeEntry]: value
    }));
  }, [activeEntry]);

  // Export to YAML
  const handleExportYaml = () => {
    try {
      setError(null); // Clear previous global error
      const yaml = generateYaml(entries);
      setYamlExport(yaml);
      setShowYamlExport(true);
    } catch (err: unknown) { // Catch unknown error type
       const errorMsg = err instanceof Error ? err.message : "An unknown error occurred during YAML export";
       setError(`Export error: ${errorMsg}`); // Set string error message
       console.error("Export YAML error:", err);
    }
  };

  // Load demo data
  const handleLoadDemo = () => {
    try {
      setError(null); // Clear previous global error
      const demoEntries = parseYaml(exampleYaml);

      if (!demoEntries || Object.keys(demoEntries).length === 0) {
        throw new Error("No valid entries found in demo data. Check presets.ts.");
      }

      setEntries(demoEntries);
      setActiveEntry(Object.keys(demoEntries)[0]);
    } catch (err: unknown) { // Catch unknown error type
       const errorMsg = err instanceof Error ? err.message : "An unknown error occurred loading demo data";
       setError(`Error loading demo: ${errorMsg}`); // Set string error message
       console.error("Demo loading error:", err);
    }
  };

  // Add new entry
  const handleAddEntry = () => {
    setError(null); // Clear global error when adding
    const key = `entry_${Date.now()}`;
    const newEntryContent = "{New|Fresh|Brand new} {content|text|spintax} here";
    setEntries(prev => ({
      ...prev,
      [key]: newEntryContent
    }));
    setActiveEntry(key);
  };

   // Handler to copy the exported YAML to the clipboard
   const handleCopyYamlExport = () => {
     navigator.clipboard.writeText(yamlExport)
       .then(() => { /* Optional success feedback */ })
       .catch(err => {
         console.error('Failed to copy YAML export:', err);
         setError("Failed to copy YAML to clipboard. Please copy manually."); // Set string error message
       });
   };

  // JSX for the main component layout
  return (
    <div className="w-full flex flex-col bg-gray-100 text-gray-800 font-sans h-screen max-h-screen">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 shadow-md flex flex-wrap justify-between items-center flex-shrink-0 gap-2">
        {/* Title */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold">Advanced Spintax Editor</h1>
          <p className="text-xs opacity-80">Visual tree editor for spintax</p>
        </div>
        {/* Action Buttons */}
        <div className="flex space-x-2 flex-wrap gap-1">
          <button
        onClick={() => setShowImportModal(true)}
        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center"
        title="Import Spintax or YAML"
          >
        <Upload size={14} className="mr-1" /> Import
          </button>
          {Object.keys(entries).length > 0 && (
        <button
          onClick={handleExportYaml}
          className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center"
          title="Export all entries as YAML"
        >
          <Download size={14} className="mr-1" /> Export YAML
        </button>
          )}
          <button
        onClick={handleLoadDemo}
        className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-sm flex items-center"
        title="Load example YAML data"
          >
        <FileCode size={14} className="mr-1" /> Load Demo
          </button>
        </div>
      </header>

      {/* Global Error Display Area */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 border-b border-red-300 flex-shrink-0">
          <div className="container mx-auto flex items-center text-sm">
            <AlertCircle size={16} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
            {/* Button to dismiss the global error */}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 text-lg font-bold leading-none px-1">&times;</button>
          </div>
        </div>
      )}

      {/* Main Content Area (Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Conditional) */}
        {Object.keys(entries).length > 0 && (
          <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
            {/* Sidebar Header */}
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
              <h3 className="font-semibold text-sm uppercase">Entries</h3>
              {/* Add New Entry Button */}
              <button
                onClick={handleAddEntry}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Add New Entry"
              >
                <Plus size={18}/>
              </button>
            </div>

            {/* Scrollable List of Entries */}
            <div className="overflow-y-auto flex-1">
              {Object.keys(entries).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveEntry(key)}
                  className={`w-full text-left p-3 text-sm truncate block ${
                    activeEntry === key
                      ? 'bg-blue-100 border-l-4 border-blue-500 font-medium text-blue-700'
                      : 'hover:bg-gray-50 border-l-4 border-transparent text-gray-700'
                  }`}
                  title={key}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Editor/Welcome Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Conditionally render Editor Tab or Welcome message */}
          {activeEntry && entries[activeEntry] !== undefined ? (
            <SpintaxEditorTab
              key={activeEntry}
              initialSpintax={entries[activeEntry]}
              onUpdate={updateEntry}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-gray-50">
              <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Welcome to the Spintax Editor</h2>
                {Object.keys(entries).length === 0 ? (
                    <p className="mb-4 text-gray-600">Get started by importing spintax content or loading the demo data.</p>
                ) : (
                    <p className="mb-4 text-gray-600">Select an entry from the sidebar to begin editing, or add a new one.</p>
                )}
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
                  >
                    <Upload size={16} className="mr-2" /> Import Content
                  </button>
                  <button
                    onClick={handleLoadDemo}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center"
                  >
                    <FileCode size={16} className="mr-2" /> Load Demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal (Rendered conditionally by its internal logic) */}
      <ImportExportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      {/* YAML Export Modal (Rendered conditionally) */}
      {showYamlExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* Export Modal Content Box */}
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
            {/* Export Modal Header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-semibold">Export YAML</h2>
              {/* Close button */}
              <button
                onClick={() => setShowYamlExport(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Export Modal Body (Scrollable) */}
            <div className="p-4 flex-1 overflow-auto">
              {/* Read-only Textarea for YAML */}
              <textarea
                value={yamlExport}
                readOnly
                className="w-full h-64 p-2 border rounded font-mono text-sm bg-gray-50 focus:ring-0 focus:border-gray-300"
                aria-label="Exported YAML content"
              />
            </div>

            {/* Export Modal Footer */}
            <div className="p-4 border-t flex justify-end space-x-2 flex-shrink-0 bg-gray-50">
              {/* Copy to Clipboard Button */}
              <button
                onClick={handleCopyYamlExport}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <Copy size={14} className="mr-2" /> Copy to Clipboard
              </button>
              {/* Close Button */}
              <button
                onClick={() => setShowYamlExport(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpintaxEditorComponent;


