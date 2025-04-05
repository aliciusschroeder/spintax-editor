"use client"

import { exampleSpintax, exampleYaml } from '@/config/presets';
import { AlertCircle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Download, Eye, FileCode, FileText, Pencil, Plus, RotateCw, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Helper to parse content within an option (text and nested choices)
const parseOptionContent = (str, startIndex, endIndex) => {
    const option = { type: 'option', content: '', children: [] };
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
            const text = str.substring(processingIndex, endIndex).replace(/\r\n|\r|\n/g, ' ');
            if (text) {
                if (option.children.length === 0 && !option.content) {
                    option.content = text; 
                } else {
                    option.children.push({ type: 'text', content: text });
                }
            }
            processingIndex = endIndex;
        } else {
            // Text before the nested choice
            const text = str.substring(processingIndex, nextBrace).replace(/\r\n|\r|\n/g, ' ');
            if (text) {
                if (option.children.length === 0 && !option.content) {
                    option.content = text;
                } else {
                    option.children.push({ type: 'text', content: text });
                }
            }

            // Parse the nested choice recursively using parseChoice
            const nestedResult = parseChoice(str, nextBrace);
            if (nestedResult && nestedResult.choiceNode) {
              option.children.push(nestedResult.choiceNode);
              processingIndex = nestedResult.endIndex;
            } else {
              processingIndex = nextBrace + 1;
            }
        }
    }

    // Trim content and filter empty text children for cleaner output
    if (option.content) option.content = option.content.trim();
    option.children = option.children
        .map(child => {
            if (child.type === 'text' && child.content) {
                child.content = child.content.trim();
            }
            return child;
        })
        .filter(child => !(child.type === 'text' && !child.content));

    // Simplify: if only one text child and no main content, move text to content.
    if (!option.content && option.children.length === 1 && option.children[0].type === 'text') {
        option.content = option.children[0].content;
        option.children = [];
    }

    // Remove final empty text nodes if content exists
    if (option.content && option.children.length > 0) {
       const lastChild = option.children[option.children.length - 1];
       if (lastChild.type === 'text' && !lastChild.content) {
           option.children.pop();
       }
    }

    return option;
};

// Helper to parse a choice block '{...}'
const parseChoice = (str, startIndex) => {
    const choice = { type: 'choice', children: [] };
    let i = startIndex + 1; // Move past '{'
    let optionStartIndex = i;
    let braceDepth = 1; // Start inside the choice's braces

    if (startIndex >= str.length -1 || str[startIndex] !== '{') {
        return { choiceNode: choice, endIndex: startIndex + 1 };
    }

    while (i < str.length) {
        const char = str[i];
        let processedChar = false;

        if (char === '{') {
            braceDepth++;
        } else if (char === '}') {
            braceDepth--;
            if (braceDepth === 0) {
                const optionNode = parseOptionContent(str, optionStartIndex, i);
                choice.children.push(optionNode);
                i++;
                processedChar = true;
                break;
            } else if (braceDepth < 0) {
                const optionNode = parseOptionContent(str, optionStartIndex, i);
                choice.children.push(optionNode);
                processedChar = true;
                break;
            }
        } else if (char === '|' && braceDepth === 1) {
            const optionNode = parseOptionContent(str, optionStartIndex, i);
            choice.children.push(optionNode);
            i++;
            optionStartIndex = i;
            processedChar = true;
        }

        if (!processedChar) {
             i++;
        }
    }

    if (braceDepth !== 0) {
        if (i > optionStartIndex && braceDepth > 0) {
             const optionNode = parseOptionContent(str, optionStartIndex, i);
             choice.children.push(optionNode);
        }
    }

    return { choiceNode: choice, endIndex: i };
};

// Main parsing function - entry point
const parseSpintax = (text) => {
    if (typeof text !== 'string' || !text) return { type: 'root', children: [] };

    text = text.trim();
    const rootNode = { type: 'root', children: [] };
    let currentIndex = 0;

    while (currentIndex < text.length) {
        // Find next '{', assuming no escaped braces for simplicity
        const nextBrace = text.indexOf('{', currentIndex);

        if (nextBrace === -1) {
            // No more choices, add remaining text with normalization 
            // that preserves multiple spaces as a single space
            const remainingText = text.substring(currentIndex).replace(/\r\n|\r|\n/g, ' ');
            if (remainingText) {
                rootNode.children.push({ type: 'text', content: remainingText });
            }
            currentIndex = text.length;
        } else {
            if (nextBrace > currentIndex) {
                // Add text before the choice with normalization
                const textBefore = text.substring(currentIndex, nextBrace).replace(/\r\n|\r|\n/g, ' ');
                if (textBefore) {
                    rootNode.children.push({ type: 'text', content: textBefore });
                }
            }

            try {
                const choiceResult = parseChoice(text, nextBrace);
                if (choiceResult && choiceResult.choiceNode) {
                    rootNode.children.push(choiceResult.choiceNode);
                    currentIndex = choiceResult.endIndex;
                } else {
                    currentIndex = nextBrace + 1;
                }
            } catch (error) {
                currentIndex = nextBrace + 1;
            }
        }
    }
    return rootNode;
};

const generateSpintax = (node) => {
  if (!node) return '';

  if (node.type === 'text') {
    return node.content || '';
  }

  if (node.type === 'option') {
    const childContent = (node.children || []).map(child => generateSpintax(child)).join('');
    const ownContent = node.content || '';
    return ownContent + childContent;
  }

  if (node.type === 'choice') {
    if (!node.children || node.children.length === 0) return '';

    if (node.children.length === 1) {
        const singleOption = generateSpintax(node.children[0]);
        return singleOption ? `{${singleOption}}` : '';
    }

    const options = node.children.map(child => generateSpintax(child));
    return `{${options.join('|')}}`;
  }

  if (node.type === 'root') {
    return (node.children || []).map(child => generateSpintax(child)).join('');
  }

  return '';
};

const generateRandomVariant = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.content || '';
  if (node.type === 'option') {
    const ownContent = node.content || '';
    const childContent = (node.children || []).map(child => generateRandomVariant(child)).join('');
    return ownContent + childContent;
  }
  if (node.type === 'choice') {
    if (!node.children || node.children.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * node.children.length);
    const chosenOption = node.children[randomIndex];
    return chosenOption ? generateRandomVariant(chosenOption) : '';
  }
  if (node.type === 'root') {
    return (node.children || []).map(child => generateRandomVariant(child)).join('');
  }
  return '';
};

const calculateVariations = (node) => {
  if (!node) return 1;
  
  try {
    if (node.type === 'text') {
      return 1;
    }

    if (node.type === 'option') {
      let variations = 1;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            const childVar = calculateVariations(child);
            variations *= childVar;
            if (variations > 1000000) return Infinity;
        }
      }
      return variations;
    }

    if (node.type === 'choice') {
      if (!node.children || node.children.length === 0) {
        return 1;
      }
      let totalVariations = 0;
      for (const child of node.children) {
          const optionVars = calculateVariations(child);
          totalVariations += optionVars;
          if (totalVariations > 1000000) return Infinity;
      }
      return totalVariations === 0 ? 1 : totalVariations;
    }

    if (node.type === 'root') {
      if (!node.children || node.children.length === 0) {
        return 1;
      }
      let variations = 1;
      for (const child of node.children) {
          const childVar = calculateVariations(child);
          variations *= childVar;
          if (variations > 1000000) return Infinity;
      }
      return variations;
    }
  } catch (error) {
    return Infinity;
  }

  return 1;
};

// --- NodeEditor Component ---
const NodeEditor = ({ node, path, updateNode, deleteNode, addNode }) => {
  if (!node) {
    return <div className="p-2 my-1 bg-red-100 text-red-800 rounded text-xs">Error: Missing node data</div>;
  }

  const [isExpanded, setIsExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(node?.content ?? '');

  useEffect(() => {
    setEditContent(node?.content ?? '');
  }, [node?.content]);

  const handleToggle = () => setIsExpanded(!isExpanded);
  const handleEdit = () => { setEditContent(node?.content ?? ''); setEditMode(true); };
  const handleCancel = () => { setEditMode(false); setEditContent(node?.content ?? ''); };
  const handleDelete = () => deleteNode(path);

  const handleSave = () => {
    if (node) {
       updateNode(path, { ...node, content: editContent });
    }
    setEditMode(false);
  };

  // --- Add Action Handlers ---
  const handleAddOption = () => {
    const newOption = { type: 'option', content: '', children: [] };
    const newPath = [...path, 'children', (node?.children?.length ?? 0)];
    addNode(newPath, newOption);
  };

  const handleAddChoice = () => {
    const newChoice = { type: 'choice', children: [{ type: 'option', content: 'A', children: [] }, { type: 'option', content: 'B', children: [] }] };
    const newPath = [...path, 'children', (node?.children?.length ?? 0)];
    addNode(newPath, newChoice);
  };

  const handleAddText = () => {
    const newText = { type: 'text', content: 'new text' };
    const newPath = [...path, 'children', (node?.children?.length ?? 0)];
    addNode(newPath, newText);
  };

  // Helper to get a node by path
  const getNodeByPath = (nodePath) => {
    // Start from root node
    const rootNode = { type: 'root', children: [] };
    
    // If no path, return current node
    if (!nodePath || nodePath.length === 0) return node;
    
    // Build full path to root 
    const fullPath = [];
    let current = path;
    while (current.length > 0) {
      fullPath.unshift(current[current.length-1]);
      fullPath.unshift(current[current.length-2]);
      current = current.slice(0, -2);
    }
    
    // Now navigate using full path + provided path
    const combinedPath = [...fullPath.slice(0, -2), ...nodePath];
    
    // Get root node from parent structure
    const ancestorPath = path.slice(0, -2);
    const ancestor = ancestorPath.length === 0 ? node : getNodeByPath(ancestorPath);
    
    if (!ancestor) return null;
    
    let result = ancestor;
    for (let i = 0; i < nodePath.length; i += 2) {
      const prop = nodePath[i];
      const index = nodePath[i+1];
      if (!result || !result[prop] || result[prop].length <= index || index < 0) {
        return null;
      }
      result = result[prop][index];
    }
    return result;
  };

  // --- Reorder Handlers ---
  const handleMoveUp = () => {
    if (!path || path.length < 2) return; // Need at least parent and index
    
    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1];
    
    if (currentIndex <= 0) return; // Already at the top
    
    // Direct modification of the tree structure
    updateNode(parentPath, (parentNode) => {
      if (!parentNode || !parentNode.children) return parentNode;
      
      const newChildren = [...parentNode.children];
      const [removed] = newChildren.splice(currentIndex, 1);
      newChildren.splice(currentIndex - 1, 0, removed);
      
      return { ...parentNode, children: newChildren };
    });
  };

  const handleMoveDown = () => {
    if (!path || path.length < 2) return;
    
    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1];
    const parentNode = getParentNode();
    
    if (!parentNode || !parentNode.children || currentIndex >= parentNode.children.length - 1) {
      return; // Already at the bottom
    }
    
    // Direct modification of the tree structure
    updateNode(parentPath, (parentNode) => {
      if (!parentNode || !parentNode.children) return parentNode;
      
      const newChildren = [...parentNode.children];
      const [removed] = newChildren.splice(currentIndex, 1);
      newChildren.splice(currentIndex + 1, 0, removed);
      
      return { ...parentNode, children: newChildren };
    });
  };

  // Helper to get parent node
  const getParentNode = () => {
    if (!path || path.length < 2) return null;
    const parentPath = path.slice(0, -2);
    
    if (parentPath.length === 0) {
      // This is a direct child of root
      return { type: 'root', children: [] }; // Mock parent
    }
    
    // Find the parent node's path relative to the current node
    const parentRootRelativePath = [];
    for (let i = 0; i < path.length - 2; i++) {
      parentRootRelativePath.push(path[i]);
    }
    
    // Walk up to find ancestors if needed
    if (parentRootRelativePath.length === 0) {
      return null;
    }
    
    let current = node;
    
    while (parentRootRelativePath.length > 0) {
      const prop = parentRootRelativePath.shift();
      const index = parentRootRelativePath.shift();
      if (!current || !current[prop] || current[prop].length <= index) {
        return null;
      }
      current = current[prop][index];
    }
    
    return current;
  };

  // --- Determine if order matters ---
  const shouldShowOrderControls = () => {
    // Order matters for all nodes within an option node or root
    const isWithinOrderContainer = path.length >= 2 && 
      ((getParentNode()?.type === 'option') || 
       (getParentNode()?.type === 'root' && node.type !== 'option'));
       
    // return isWithinOrderContainer && path.length > 0;
    return true;
  };

  // --- Check for consecutive choices ---
  const needsTextBetween = () => {
    if (!path || path.length < 2 || node.type !== 'choice') return false;
    
    const parentNode = getParentNode();
    if (!parentNode || !parentNode.children) return false;
    
    const currentIndex = path[path.length - 1];
    
    if (currentIndex > 0) {
      const prevSibling = parentNode.children[currentIndex - 1];
      if (prevSibling && prevSibling.type === 'choice') {
        return true;
      }
    }
    
    return false;
  };

  // --- Insert text between choices ---
  const handleInsertTextBefore = () => {
    if (!path || path.length < 2) return;
    
    const parentPath = path.slice(0, -2);
    const currentIndex = path[path.length - 1];
    
    // Create a new text node
    const newText = { type: 'text', content: ' ' }; // Space as default
    
    // Insert before current node
    const insertPath = [...parentPath, 'children', currentIndex];
    addNode(insertPath, newText);
  };

  // --- Node Styling and Structure ---
  const getNodeColor = () => {
    const nodeType = node?.type ?? 'unknown';
    switch (nodeType) {
      case 'root': return 'bg-gray-100';
      case 'choice': return 'bg-blue-100';
      case 'option': return 'bg-green-100';
      case 'text': return 'bg-yellow-100';
      default: return 'bg-red-100';
    }
  };
  const canHaveChildren = node && (node.type === 'root' || node.type === 'choice' || node.type === 'option');
  const hasChildren = canHaveChildren && Array.isArray(node.children) && node.children.length > 0;
  const showOrderControls = shouldShowOrderControls();

  return (
    <div className={`rounded p-2 mb-1 ${getNodeColor()} border border-gray-300`}>
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
        {/* Toggle */}
        <div className="w-4 flex-shrink-0">
         {canHaveChildren && hasChildren && (
           <button onClick={handleToggle} className="focus:outline-none text-gray-500 hover:text-gray-800">
             {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
           </button>
         )}
        </div>
        
        {/* Content / Type Display */}
        <div className="flex-1 min-w-0">
          {editMode && (node.type === 'text' || node.type === 'option') ? (
             <div className="flex items-center space-x-2">
              <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="flex-1 p-1 border rounded bg-white text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}/>
              <button onClick={handleSave} className="p-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">Save</button>
              <button onClick={handleCancel} className="p-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-600 uppercase w-16 flex-shrink-0">{node.type || 'unknown'}</span>
              {(node.type === 'text' || node.type === 'option') ? (
                <span className="cursor-pointer hover:bg-gray-200/50 px-1 py-0.5 rounded flex-1 break-words min-w-0 text-sm" onClick={handleEdit} title="Click to edit">
                  {node.content ? node.content : <span className="italic text-gray-400">empty text</span>}
                </span>
              ) : (
                 <span className="p-1 text-sm text-gray-700">
                    {node.type === 'choice' ? `${node.children?.length ?? 0} options` : ''}
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
              className="p-1 text-gray-500 hover:bg-gray-200 rounded"
              title="Move Up">
              <ArrowUp size={12} />
            </button>
            <button 
              onClick={handleMoveDown}
              className="p-1 text-gray-500 hover:bg-gray-200 rounded"
              title="Move Down">
              <ArrowDown size={12} />
            </button>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-1 flex-shrink-0">
           {(node.type === 'text' || node.type === 'option') && !editMode && (
             <button onClick={handleEdit} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Edit Content">
               <Pencil size={14} />
             </button>
           )}
          {node.type !== 'root' && (
            <button onClick={handleDelete} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Delete Node">
              <Trash2 size={14} />
            </button>
          )}
          {node.type === 'choice' && (
            <button onClick={handleAddOption} className="p-1 text-green-500 hover:bg-green-100 rounded" title="Add Option">
              <Plus size={14} /> <span className="text-xs">Opt</span>
            </button>
          )}
          {node.type === 'option' && (
            <>
              <button onClick={handleAddText} className="p-1 text-yellow-600 hover:bg-yellow-100 rounded" title="Add Text Node inside Option">
                <Plus size={14} /> <span className="text-xs">Txt</span>
              </button>
              <button onClick={handleAddChoice} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Add Choice Node inside Option">
                <Plus size={14} /> <span className="text-xs">Choice</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Children Area */}
      {isExpanded && hasChildren && (
        <div className="pl-6 mt-1 border-l-2 border-gray-300 ml-2">
          {(node.children || []).map((child, index) => (
            <NodeEditor 
              key={index} 
              node={child} 
              path={[...path, 'children', index]} 
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

// --- SpintaxEditorTab Component ---
const SpintaxEditorTab = ({ initialSpintax = '', onUpdate }) => {
  const [spintaxTree, setSpintaxTree] = useState(() => {
     try { return parseSpintax(initialSpintax); }
     catch (e) { return { type: 'root', children: [] }; }
  });
  const [outputText, setOutputText] = useState('');
  const [randomPreview, setRandomPreview] = useState('');
  const [variationCount, setVariationCount] = useState(() => {
      try {
         const initialTree = parseSpintax(initialSpintax);
         const vars = calculateVariations(initialTree);
         return vars === Infinity ? Infinity : vars;
      } catch(e) { return 0; }
  });
  const [activeTab, setActiveTab] = useState('editor');
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    try {
      setParseError(null);
      const tree = parseSpintax(initialSpintax);
      setSpintaxTree(tree);
      setRandomPreview('');
      setOutputText(generateSpintax(tree));
      const vars = calculateVariations(tree);
      setVariationCount(vars === Infinity ? Infinity : vars);
    } catch (error) {
      setParseError("Error parsing spintax");
      setSpintaxTree({ type: 'root', children: [] });
      setOutputText('');
      setVariationCount(0);
    }
  }, [initialSpintax]);

  useEffect(() => {
    if (!spintaxTree) {
      setOutputText('');
      setVariationCount(0);
      return;
    }

    let currentOutput = '';
    let currentVariationsResult = 0;
    let errorOccurred = false;

    try {
      currentOutput = generateSpintax(spintaxTree);
    } catch (error) {
      currentOutput = `Error generating`;
      errorOccurred = true;
    }

    try {
      currentVariationsResult = calculateVariations(spintaxTree);
      setVariationCount(currentVariationsResult === Infinity ? Infinity : currentVariationsResult);
    } catch (error) {
      setVariationCount(error.message === "Overflow" ? Infinity : 0);
      errorOccurred = true;
    }

    setOutputText(currentOutput);

    const initialOutputFromProp = generateSpintax(parseSpintax(initialSpintax || ''));
    if (onUpdate && !errorOccurred && currentOutput !== initialOutputFromProp) {
      onUpdate(currentOutput);
    }
  }, [spintaxTree, onUpdate, initialSpintax]);

  // Memoized callbacks for NodeEditor
  const updateNode = useCallback((path, newNodeOrFunction) => {
    setSpintaxTree(prevTree => {
      try {
        const newTree = JSON.parse(JSON.stringify(prevTree || { type: 'root', children: [] }));
        
        // Handle function updater pattern for convenience
        const newNode = typeof newNodeOrFunction === 'function'
          ? newNodeOrFunction(getNodeByPath(newTree, path))
          : newNodeOrFunction;
        
        if (!newNode) return prevTree;
        
        if (path.length === 0) return { ...newTree, ...newNode, type: 'root' };
        
        let current = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
           const prop = path[i]; const index = path[i+1];
           if (!current || !current[prop]?.[index]) throw new Error(`Invalid path`);
           current = current[prop][index];
        }
        
        const parentProperty = path[path.length - 2]; 
        const nodeIndex = path[path.length - 1];
        
        if (current && Array.isArray(current[parentProperty]) && current[parentProperty][nodeIndex] !== undefined) {
           current[parentProperty][nodeIndex] = newNode; 
           return newTree;
        } else { 
          throw new Error(`Invalid target`); 
        }
      } catch (error) { 
        console.error("Update node error:", error);
        return prevTree; 
      }
    });
  }, []);

  // Helper to get a node by path
  const getNodeByPath = useCallback((tree, nodePath) => {
    if (!tree || !nodePath || nodePath.length === 0) return tree;
    
    let current = tree;
    for (let i = 0; i < nodePath.length; i += 2) {
      const prop = nodePath[i];
      const index = nodePath[i+1];
      if (!current || !current[prop] || !current[prop][index]) {
        return null;
      }
      current = current[prop][index];
    }
    return current;
  }, []);

  const deleteNode = useCallback((path) => {
    if (!path || path.length === 0) return;
    setSpintaxTree(prevTree => {
       try {
        const newTree = JSON.parse(JSON.stringify(prevTree || { type: 'root', children: [] }));
        let current = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
            const prop = path[i]; const index = path[i+1];
            if (!current || !current[prop]?.[index]) throw new Error(`Invalid path`);
            current = current[prop][index];
        }
        const parentProperty = path[path.length - 2]; const nodeIndex = path[path.length - 1];
        if (current && parentProperty === 'children' && Array.isArray(current.children) && current.children.length > nodeIndex) {
            current.children.splice(nodeIndex, 1); return newTree;
        } else { throw new Error(`Invalid target`); }
       } catch (error) { return prevTree; }
    });
  }, []);

  const addNode = useCallback((path, newNode) => {
    if (!path || !newNode) return;
    setSpintaxTree(prevTree => {
       try {
        const newTree = JSON.parse(JSON.stringify(prevTree || { type: 'root', children: [] }));
        if (path.length === 1 && path[0] === 'children') {
            if (!newTree.children) newTree.children = [];
            const targetIndex = path[path.length-1];
            const validIndex = Math.max(0, Math.min(targetIndex ?? newTree.children.length, newTree.children.length));
            newTree.children.splice(validIndex, 0, newNode);
            return newTree;
        }
        let current = newTree;
        for (let i = 0; i < path.length - 2; i += 2) {
            const prop = path[i]; const index = path[i+1];
            if (!current || !current[prop]?.[index]) throw new Error(`Invalid path`);
            current = current[prop][index];
        }
        const parentProperty = path[path.length - 2]; const targetIndex = path[path.length - 1];
        if (current && parentProperty === 'children') {
            if (!current.children) current.children = [];
             const validIndex = Math.max(0, Math.min(targetIndex, current.children.length));
            current.children.splice(validIndex, 0, newNode);
            return newTree;
        } else { throw new Error(`Invalid target`); }
       } catch(error) { 
         console.error("Add node error:", error);
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
    } catch (error) { setRandomPreview('Error generating preview'); }
  }, [spintaxTree]);

  const handleCopyOutput = () => navigator.clipboard.writeText(outputText).catch(err => {});
  const handleClearAll = () => setSpintaxTree({ type: 'root', children: [] });

  // Format variation count for display
  const displayVariationCount = variationCount === Infinity ? 'Overflow' : variationCount.toLocaleString();

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b bg-gray-50 flex-shrink-0">
         <button className={`px-4 py-2 text-sm ${activeTab === 'editor' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => setActiveTab('editor')}> <Pencil size={16} className="inline mr-1 mb-0.5" /> Editor </button>
         <button className={`px-4 py-2 text-sm ${activeTab === 'preview' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => { setActiveTab('preview'); generatePreview(); }}> <Eye size={16} className="inline mr-1 mb-0.5" /> Preview </button>
         <button className={`px-4 py-2 text-sm ${activeTab === 'export' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => setActiveTab('export')}> <FileText size={16} className="inline mr-1 mb-0.5" /> Export </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col h-full">
            {/* Editor Actions Bar */}
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-wrap flex-shrink-0">
               <div className="flex space-x-2 items-center mb-1 sm:mb-0">
                 <span className="text-sm font-medium mr-2">Add to Root:</span>
                 <button onClick={() => addNode(['children', (spintaxTree?.children?.length ?? 0)], { type: 'text', content: 'new text' })} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-xs flex items-center" title="Add Text block at the end of the root level"> <Plus size={12} className="mr-1" /> Text </button>
                 <button onClick={() => addNode(['children', (spintaxTree?.children?.length ?? 0)], { type: 'choice', children: [{ type: 'option', content: 'A', children: [] }, { type: 'option', content: 'B', children: [] }] })} className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-xs flex items-center" title="Add Choice block {A|B} at the end of the root level"> <Plus size={12} className="mr-1" /> Choice </button>
               </div>
               <button onClick={handleClearAll} className="px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-xs flex items-center" title="Clear the entire editor content"> <Trash2 size={12} className="mr-1" /> Clear All </button>
             </div>
            {/* Editor Tree View */}
             <div className="flex-1 overflow-auto p-2 bg-white">
               {parseError ? (
                  <div className="p-4 my-2 text-red-700 bg-red-50 rounded border border-red-200">
                    <div className="flex items-center mb-1"><AlertCircle size={18} className="mr-2 text-red-600" /><p className="font-semibold">Spintax Parsing Error</p></div>
                    <p className="text-sm">{parseError}</p><p className="text-xs mt-2 text-gray-600">Editor may be empty or showing partial structure.</p>
                  </div>
               ) : (
                 <div className="border rounded p-2 bg-gray-50 min-h-full">
                    <NodeEditor node={spintaxTree} path={[]} updateNode={updateNode} deleteNode={deleteNode} addNode={addNode}/>
                    {(!spintaxTree || !spintaxTree.children || spintaxTree.children.length === 0) && !parseError && (
                      <p className="text-center text-gray-400 italic p-4">Editor is empty. Use 'Add to Root' buttons to start.</p>
                    )}
                 </div>
               )}
             </div>

            {/* Current Spintax Display */}
            <div className="p-2 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Spintax:</span>
                <span className="text-sm text-gray-600">
                  Total variations: <span className="font-medium text-blue-800">{displayVariationCount}</span>
                </span>
              </div>
              <div className="mt-1 p-2 bg-white border rounded overflow-auto max-h-20">
                <pre className="text-xs font-mono whitespace-pre-wrap">{outputText || '<empty>'}</pre>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'preview' && (
           <div className="flex-1 flex flex-col">
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
               <button onClick={generatePreview} className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"> <RotateCw size={14} className="mr-1" /> Generate New Preview </button>
               <span className="text-sm text-gray-600"> Variations: {displayVariationCount} </span>
             </div>
             <div className="flex-1 overflow-auto p-4 bg-white">
               <div className="border rounded p-4 bg-gray-50 min-h-[100px] whitespace-pre-wrap">
                 {randomPreview || <span className="text-gray-400 italic">Click &apos;Generate New Preview&apos; to see a random variation here.</span>}
               </div>
             </div>
           </div>
        )}
        {activeTab === 'export' && (
           <div className="flex-1 flex flex-col">
             <div className="p-2 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
               <button onClick={handleCopyOutput} className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"> <Copy size={14} className="mr-1" /> Copy to Clipboard </button>
               <span className="text-sm text-gray-600"> Variations: {displayVariationCount} </span>
             </div>
             <div className="flex-1 overflow-auto p-4 bg-white">
               <textarea
                 readOnly
                 value={outputText}
                 className="w-full h-full p-3 border rounded font-mono text-sm resize-none"
                 placeholder="Generated spintax will appear here..."
               />
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

// Import/Export Modal Component
const ImportExportModal = ({ isOpen, onClose, onImport }) => {
  const [importText, setImportText] = useState(exampleSpintax);
  const [importType, setImportType] = useState('spintax'); // 'spintax' or 'yaml'
  const [error, setError] = useState('');

  const handleImport = () => {
    try {
      setError('');
      if (importType === 'spintax') {
        onImport({ singleSpintax: importText });
      } else {
        // Parse YAML and import
        const entries = parseYaml(importText);
        if (!entries || Object.keys(entries).length === 0) {
          setError('No valid entries found in YAML.');
          return;
        }
        onImport({ yamlEntries: entries });
      }
      onClose();
    } catch (e) {
      console.error("Import error:", e);
      setError(`Error parsing ${importType}: ${e.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Import Content</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto">
          <div className="mb-4">
            <div className="flex space-x-4 mb-2">
              <label className="flex items-center">
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
              <label className="flex items-center">
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
            
            {importType === 'yaml' && (
              <div className="mb-2 p-2 bg-blue-50 text-sm rounded">
                <p className="mb-1 font-medium">YAML Format Example:</p>
                <pre className="text-xs overflow-auto max-h-32 bg-white p-2 border rounded">{exampleYaml}</pre>
              </div>
            )}
            
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-64 p-2 border rounded font-mono text-sm"
              placeholder={importType === 'spintax' 
                ? 'Paste your spintax here...' 
                : 'Paste your YAML content here...'}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
              <AlertCircle size={14} className="inline mr-1" />
              {error}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!importText.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

const SpintaxEditorComponent = () => {
  const [entries, setEntries] = useState({});
  const [activeEntry, setActiveEntry] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [yamlExport, setYamlExport] = useState('');
  const [showYamlExport, setShowYamlExport] = useState(false);
  const [error, setError] = useState('');

  // Handle importing data
  const handleImport = ({ singleSpintax, yamlEntries }) => {
    try {
      setError('');
      if (singleSpintax) {
        const key = `spintax_${Date.now()}`;
        setEntries({ [key]: singleSpintax });
        setActiveEntry(key);
      } else if (yamlEntries && Object.keys(yamlEntries).length > 0) {
        setEntries(yamlEntries);
        setActiveEntry(Object.keys(yamlEntries)[0]);
      }
    } catch (err) {
      setError(`Import error: ${err.message}`);
    }
  };

  // Handle entry updates
  const updateEntry = useCallback((value) => {
    if (!activeEntry) return;
    
    setEntries(prev => ({
      ...prev,
      [activeEntry]: value
    }));
  }, [activeEntry]);

  // Export to YAML
  const handleExportYaml = () => {
    try {
      setError('');
      const yaml = generateYaml(entries);
      setYamlExport(yaml);
      setShowYamlExport(true);
    } catch (err) {
      setError(`Export error: ${err.message}`);
    }
  };

  // Load demo data
  const handleLoadDemo = () => {
    try {
      setError('');
      const demoEntries = parseYaml(exampleYaml);
      
      if (!demoEntries || Object.keys(demoEntries).length === 0) {
        throw new Error("No valid entries found in demo data");
      }
      
      setEntries(demoEntries);
      setActiveEntry(Object.keys(demoEntries)[0]);
    } catch (err) {
      setError(`Error loading demo: ${err.message}`);
      console.error("Demo loading error:", err);
    }
  };

  // Add new entry
  const handleAddEntry = () => {
    const key = `entry_${Date.now()}`;
    setEntries(prev => ({
      ...prev,
      [key]: "{New|Fresh|Brand new} {content|text|spintax} here"
    }));
    setActiveEntry(key);
  };

  return (
    <div className="w-full flex flex-col bg-gray-100 text-gray-800 font-sans h-screen">
      <header className="bg-blue-600 text-white p-3 shadow-md flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold">Advanced Spintax Editor</h1>
          <p className="text-xs opacity-80">Create and edit spintax with a visual tree editor</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center"
          >
            <Upload size={14} className="mr-1" /> Import
          </button>
          {Object.keys(entries).length > 0 && (
            <button 
              onClick={handleExportYaml}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center"
            >
              <Download size={14} className="mr-1" /> Export YAML
            </button>
          )}
          <button 
            onClick={handleLoadDemo}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm flex items-center"
          >
            <FileCode size={14} className="mr-1" /> Load Demo
          </button>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 border-b border-red-300">
          <div className="container mx-auto flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only shown when multiple entries exist */}
        {Object.keys(entries).length > 0 && (
          <div className="w-64 bg-white border-r overflow-y-auto flex-shrink-0">
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase">Entries</h3>
              <button 
                onClick={handleAddEntry}
                className="p-1 text-blue-500 hover:text-blue-700" 
                title="Add New Entry"
              >
                <Plus size={18}/>
              </button>
            </div>
            
            <div className="overflow-y-auto">
              {Object.keys(entries).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveEntry(key)}
                  className={`w-full text-left p-3 text-sm truncate ${
                    activeEntry === key 
                      ? 'bg-blue-100 border-l-4 border-blue-500 font-medium' 
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                  title={key}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeEntry && entries[activeEntry] ? (
            <SpintaxEditorTab 
              key={activeEntry}
              initialSpintax={entries[activeEntry]} 
              onUpdate={updateEntry}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div className="max-w-md p-6 bg-white rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Welcome to the Spintax Editor</h2>
                <p className="mb-4">Get started by importing spintax content or loading the demo data.</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  >
                    <Upload size={16} className="mr-2" /> Import Content
                  </button>
                  <button
                    onClick={handleLoadDemo}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center"
                  >
                    <FileCode size={16} className="mr-2" /> Load Demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Import Modal */}
      <ImportExportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
      
      {/* YAML Export Modal */}
      {showYamlExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Export YAML</h2>
              <button 
                onClick={() => setShowYamlExport(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-auto">
              <textarea
                value={yamlExport}
                readOnly
                className="w-full h-64 p-2 border rounded font-mono text-sm"
              />
            </div>
            
            <div className="p-4 border-t flex justify-end space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(yamlExport).catch(err => {
                    console.error('Failed to copy:', err);
                  });
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <Copy size={14} className="mr-2" /> Copy to Clipboard
              </button>
              <button
                onClick={() => setShowYamlExport(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
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