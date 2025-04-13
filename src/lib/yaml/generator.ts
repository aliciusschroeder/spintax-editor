/**
 * Advanced YAML generator for Spintax Editor.
 * Updates a YAML Document AST with new values for editable entries,
 * preserving all non-editable content, comments, and formatting.
 */

import type { YamlEntryMap } from "@/types/yaml";
import YAML, { isScalar, isSeq } from "yaml";

/**
 * Generates a YAML string from a YamlEntryMap and the original Document AST.
 * - Updates editable entries in the AST with new values.
 * - Leaves non-editable nodes untouched.
 * - Preserves comments and formatting.
 *
 * @param entryMap - The map of YAML entries (with updated values)
 * @param originalDoc - The original YAML Document AST
 * @returns YAML string with updated values
 */
export function generateYamlFromEntryMap(
  entryMap: YamlEntryMap,
  originalDoc: YAML.Document.Parsed
): string {
  // Update the AST in-place for editable entries
  for (const entry of Object.values(entryMap)) {
    if (!entry.node) continue;
    if (entry.type === "string" && isScalar(entry.node)) {
      entry.node.value = entry.value;
    } else if (entry.type === "stringArray" && isSeq(entry.node)) {
      // Update each string element in the sequence
      for (let i = 0; i < entry.value.length; i++) {
        const item = entry.node.items[i];
        if (isScalar(item)) {
          item.value = entry.value[i];
        }
      }
      // If array length changed, handle add/remove (not supported in UI yet)
    }
    // Non-editable: do not modify
  }

  // Output YAML with preserved formatting/comments
  return originalDoc.toString();
}
