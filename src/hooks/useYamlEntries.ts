/**
 * useYamlEntries Hook (Refactored for advanced YAML handling)
 *
 * Manages YAML entries as a YamlEntryMap, supports editable/non-editable distinction,
 * and provides methods for UI integration and robust import/export.
 */

import { exampleYaml } from "@/config/presets";
import { generateYamlFromEntryMap } from "@/lib/yaml/generator";
import { parseYamlToEntryMap } from "@/lib/yaml/parser";
import type { YamlEntry, YamlEntryMap } from "@/types/yaml";
import { useCallback, useState } from "react";
import YAML from "yaml";

/**
 * Return type for the useYamlEntries hook
 */
interface UseYamlEntriesReturn {
  /** The current entries data (flattened for UI: key or key[index]) */
  entries: Record<string, { entry: YamlEntry; arrayIndex?: number }>;

  /** The currently active/selected entry key (UI: key or key[index]) */
  activeEntry: string | null;

  /** Any error that occurred during operations */
  error: string | null;

  /** Set the active entry by key (UI: key or key[index]) */
  setActiveEntry: (key: string | null) => void;

  /** Update an existing entry (UI: key or key[index]) */
  updateEntry: (key: string, content: string) => void;

  /** Add a new editable string entry and return its key */
  addEntry: (key?: string, content?: string) => string;

  /** Import entries from a YAML string */
  importFromYaml: (yamlString: string) => void;

  /** Export entries to a YAML string */
  exportToYaml: () => string;

  /** Load demo data */
  loadDemo: () => void;
}

/**
 * Flattens a YamlEntryMap for UI display:
 * - Editable string: key
 * - Editable array: key[0], key[1], ...
 * - Non-editable: not included
 */
function flattenEntryMap(
  entryMap: YamlEntryMap
): Record<string, { entry: YamlEntry; arrayIndex?: number }> {
  const flat: Record<string, { entry: YamlEntry; arrayIndex?: number }> = {};
  for (const [key, entry] of Object.entries(entryMap)) {
    if (entry.type === "string") {
      flat[key] = { entry };
    } else if (entry.type === "stringArray") {
      entry.value.forEach((val, idx) => {
        flat[`${key}[${idx}]`] = { entry, arrayIndex: idx };
      });
    }
    // Non-editable: not shown in UI
  }
  return flat;
}

/**
 * Custom hook for managing YAML entries (advanced version)
 */
export const useYamlEntries = (): UseYamlEntriesReturn => {
  // State for the YAML document and entry map
  const [doc, setDoc] = useState<YAML.Document.Parsed | null>(null);
  const [entryMap, setEntryMap] = useState<YamlEntryMap>({});
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flattened entries for UI
  const entries = flattenEntryMap(entryMap);

  // Import entries from a YAML string
  const importFromYaml = useCallback((yamlString: string) => {
    try {
      setError(null);
      const parsedDoc = YAML.parseDocument(yamlString, { prettyErrors: true });
      const map = parseYamlToEntryMap(yamlString);
      setDoc(parsedDoc);
      setEntryMap(map);

      // Set first editable entry as active
      const flat = flattenEntryMap(map);
      const firstKey = Object.keys(flat)[0] || null;
      setActiveEntry(firstKey);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error importing YAML: ${errorMsg}`);
      setDoc(null);
      setEntryMap({});
      setActiveEntry(null);
    }
  }, []);

  // Export entries to a YAML string
  const exportToYaml = useCallback((): string => {
    try {
      setError(null);
      if (!doc) return "";
      return generateYamlFromEntryMap(entryMap, doc);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error exporting YAML: ${errorMsg}`);
      return "";
    }
  }, [entryMap, doc]);

  // Update an existing entry (UI: key or key[index])
  const updateEntry = useCallback((uiKey: string, content: string) => {
    setEntryMap((prev) => {
      const flat = flattenEntryMap(prev);
      const flatEntry = flat[uiKey];
      if (!flatEntry) {
        console.warn(
          `Attempted to update a non-editable or non-existent entry: ${uiKey}`
        );
        return prev;
      }
      const { entry, arrayIndex } = flatEntry;

      // Only allow editing editable entries
      if (entry.type === "string") {
        return {
          ...prev,
          [entry.key]: { ...entry, value: content },
        };
      } else if (
        entry.type === "stringArray" &&
        typeof arrayIndex === "number"
      ) {
        const newArr = [...entry.value];
        newArr[arrayIndex] = content;
        return {
          ...prev,
          [entry.key]: { ...entry, value: newArr },
        };
      }
      // Non-editable: ignore
      return prev;
    });
  }, []);

  // Add a new editable string entry and update the doc/entryMap
  const addEntry = useCallback(
    (
      key?: string,
      content: string = "{New|Fresh|Brand new} {content|text|spintax} here"
    ): string => {
      if (!doc) {
        // If no doc, create a new one
        const newDoc = YAML.parseDocument("");
        setDoc(newDoc);
        const newKey = key || `entry_${Date.now()}`;
        // Add to doc AST
        newDoc.set(newKey, content);
        // Parse new entry map
        const newMap = parseYamlToEntryMap(newDoc.toString());
        setEntryMap(newMap);
        // Set as active
        setActiveEntry(newKey);
        return newKey;
      } else {
        // Add to existing doc
        const newKey = key || `entry_${Date.now()}`;
        doc.set(newKey, content);
        setDoc(doc);
        // Parse new entry map
        const newMap = parseYamlToEntryMap(doc.toString());
        setEntryMap(newMap);
        setActiveEntry(newKey);
        return newKey;
      }
    },
    [doc]
  );

  // Load demo data
  const loadDemo = useCallback(() => {
    importFromYaml(exampleYaml);
  }, [importFromYaml]);

  return {
    entries,
    activeEntry,
    error,
    setActiveEntry,
    updateEntry,
    addEntry,
    importFromYaml,
    exportToYaml,
    loadDemo,
  };
};
