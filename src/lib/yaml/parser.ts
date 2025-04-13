/**
 * Advanced YAML parser for Spintax Editor.
 * Uses the `yaml` library to support full YAML syntax, comments, and formatting.
 * Distinguishes between editable and non-editable entries.
 */

import type {
  YamlEditableArrayEntry,
  YamlEditableStringEntry,
  YamlEntryMap,
  YamlNonEditableEntry,
} from "@/types/yaml";
import YAML, { isMap, isScalar, isSeq, Node, Scalar, YAMLSeq } from "yaml";

/**
 * Parses a YAML string into a structured YamlEntryMap.
 * Editable entries: key: string, key: string[] (all elements must be strings)
 * Non-editable: nested objects, arrays with non-strings, complex keys, etc.
 */
export function parseYamlToEntryMap(yamlString: string): YamlEntryMap {
  const doc = YAML.parseDocument(yamlString, { prettyErrors: true });
  const result: YamlEntryMap = {};

  if (!isMap(doc.contents)) {
    // Only support top-level mapping for entry management
    return result;
  }

  for (const pair of doc.contents.items) {
    // Key must be a string scalar
    const keyNode = pair.key;
    const key = isScalar(keyNode) ? String(keyNode.value) : undefined;
    if (!key) continue;

    const valueNode = pair.value;
    const path = [key];

    // Editable: string scalar
    if (isScalar(valueNode) && typeof valueNode.value === "string") {
      const entry: YamlEditableStringEntry = {
        type: "string",
        key,
        value: valueNode.value,
        path,
        node: valueNode as Scalar,
      };
      result[key] = entry;
      continue;
    }

    // Editable: array of string scalars
    if (
      isSeq(valueNode) &&
      valueNode.items.every(
        (item) => isScalar(item) && typeof item.value === "string"
      )
    ) {
      const arr = valueNode.items.map((item) =>
        isScalar(item) ? String(item.value) : ""
      );
      const entry: YamlEditableArrayEntry = {
        type: "stringArray",
        key,
        value: arr,
        path,
        node: valueNode as YAMLSeq,
      };
      result[key] = entry;
      continue;
    }

    // Non-editable: everything else
    const entry: YamlNonEditableEntry = {
      type: "nonEditable",
      key,
      path,
      node: valueNode as Node,
    };
    result[key] = entry;
  }

  return result;
}
