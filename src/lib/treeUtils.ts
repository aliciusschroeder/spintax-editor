import { SpintaxNode, SpintaxPath } from "@/types";

/**
 * Helper function to get a node from a draft state by path
 * Used within Immer producer functions
 */
export const getNodeByPathInDraft = (
  draft: SpintaxNode,
  path: SpintaxPath
): SpintaxNode | null => {
  if (!path || path.length === 0) return draft;

  let current: SpintaxNode | null = draft;
  try {
    for (let i = 0; i < path.length; i += 2) {
      const prop = path[i] as string; // Treat as string for comparison
      const index = path[i + 1] as number;

      // Ensure current node exists
      if (!current) return null;

      // Check if the property is 'children' and if the node type supports children
      if (prop === "children" && "children" in current) {
        // Type-safe access to children
        const children = current.children;

        // Validate children array and index
        if (!Array.isArray(children) || children.length <= index || index < 0) {
          console.warn(
            `Invalid index ${index} for children array at path segment ${
              i / 2
            }`,
            children
          );
          return null;
        }

        // Get the next node, ensuring it's a valid SpintaxNode
        const nextNode = children[index];
        if (typeof nextNode !== "object" || nextNode === null) {
          console.error(
            "Invalid node found at path index:",
            index,
            "in children:",
            children
          );
          return null;
        }
        current = nextNode as SpintaxNode; // Update current node
      } else {
        // If prop is not 'children' or node type doesn't have children, the path is invalid
        console.error(
          `Invalid path segment: Property '${prop}' not 'children' or node type '${current.type}' does not have children.`
        );
        return null;
      }
    }
    return current;
  } catch (e) {
    console.error("Error in getNodeByPathInDraft:", e);
    return null;
  }
};
