/**
 * Type definitions for advanced YAML processing in Spintax Editor.
 *
 * Supports distinguishing between editable and non-editable entries,
 * and includes metadata for robust round-tripping and UI integration.
 */

import type { Node, Scalar, YAMLSeq } from "yaml";

/**
 * Editable string entry (key: string)
 */
export interface YamlEditableStringEntry {
  type: "string";
  key: string;
  value: string;
  path: (string | number)[];
  node: Scalar;
}

/**
 * Editable string array entry (key: string[])
 */
export interface YamlEditableArrayEntry {
  type: "stringArray";
  key: string;
  value: string[];
  path: (string | number)[];
  node: YAMLSeq;
}

/**
 * Non-editable entry (nested objects, arrays of non-strings, complex keys, etc.)
 */
export interface YamlNonEditableEntry {
  type: "nonEditable";
  key: string;
  path: (string | number)[];
  node: Node;
}

/**
 * Union type for any YAML entry
 */
export type YamlEntry =
  | YamlEditableStringEntry
  | YamlEditableArrayEntry
  | YamlNonEditableEntry;

/**
 * Map of all YAML entries by key
 */
export type YamlEntryMap = Record<string, YamlEntry>;
