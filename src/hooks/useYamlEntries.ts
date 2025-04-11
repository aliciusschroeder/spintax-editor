/**
 * useYamlEntries Hook
 *
 * A custom hook for managing YAML entries within the spintax editor.
 * Provides functionality for adding, updating, importing, and exporting entries.
 */

import { exampleYaml } from "@/config/presets";
import { generateYaml, parseYaml } from "@/lib/yaml";
import { YamlEntries } from "@/types";
import { useCallback, useState } from "react";

/**
 * Return type for the useYamlEntries hook
 */
interface UseYamlEntriesReturn {
  /** The current entries data */
  entries: YamlEntries;

  /** The currently active/selected entry key */
  activeEntry: string | null;

  /** Any error that occurred during operations */
  error: string | null;

  /** Add a new entry with optional custom key and content */
  addEntry: (key?: string, content?: string) => string;

  /** Update an existing entry with new content */
  updateEntry: (key: string, content: string) => void;

  /** Delete an entry by key */
  deleteEntry: (key: string) => void;

  /** Set the active entry by key */
  setActiveEntry: (key: string | null) => void;

  /** Import entries from a YAML string */
  importFromYaml: (yamlString: string) => void;

  /** Export entries to a YAML string */
  exportToYaml: () => string;

  /** Import a single spintax string as a new entry */
  importSingleSpintax: (spintax: string, customKey?: string) => string;

  /** Load demo data */
  loadDemo: () => void;

  /** Import data from modal */
  handleImport: (data: {
    singleSpintax?: string;
    yamlEntries?: YamlEntries;
  }) => void;
}

/**
 * Custom hook for managing YAML entries
 *
 * @param initialEntries - Initial entries to populate the state
 * @returns An object with the entries and functions to manipulate them
 */
export const useYamlEntries = (
  initialEntries?: YamlEntries
): UseYamlEntriesReturn => {
  // State for entries and active entry
  const [entries, setEntries] = useState<YamlEntries>(initialEntries || {});
  const [activeEntry, setActiveEntry] = useState<string | null>(
    Object.keys(initialEntries || {}).length > 0
      ? Object.keys(initialEntries || {})[0]
      : null
  );
  const [error, setError] = useState<string | null>(null);

  // Add a new entry
  const addEntry = useCallback(
    (
      key?: string,
      content: string = "{New|Fresh|Brand new} {content|text|spintax} here"
    ): string => {
      try {
        setError(null);

        // Generate a unique key if none provided
        const newKey = key || `entry_${Date.now()}`;

        setEntries((prev) => ({
          ...prev,
          [newKey]: content,
        }));

        setActiveEntry(newKey);
        return newKey;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        setError(`Error adding entry: ${errorMsg}`);
        console.error("Error adding entry:", e);
        return "";
      }
    },
    []
  );

  // Update an existing entry
  const updateEntry = useCallback((key: string, content: string) => {
    try {
      setError(null);

      setEntries((prev) => {
        // Check if the entry exists
        if (!(key in prev)) {
          throw new Error(`Entry with key "${key}" not found`);
        }

        return {
          ...prev,
          [key]: content,
        };
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error updating entry: ${errorMsg}`);
      console.error("Error updating entry:", e);
    }
  }, []);

  // Delete an entry
  const deleteEntry = useCallback(
    (key: string) => {
      try {
        setError(null);

        setEntries((prev) => {
          // Check if the entry exists
          if (!(key in prev)) {
            throw new Error(`Entry with key "${key}" not found`);
          }

          // Create a new object without the specified key
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = prev;

          // Update active entry if it's being deleted
          if (activeEntry === key) {
            // Set active to the first remaining entry or null if none left
            const remainingKeys = Object.keys(rest);
            setActiveEntry(remainingKeys.length > 0 ? remainingKeys[0] : null);
          }

          return rest;
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        setError(`Error deleting entry: ${errorMsg}`);
        console.error("Error deleting entry:", e);
      }
    },
    [activeEntry]
  );

  // Import entries from a YAML string
  const importFromYaml = useCallback((yamlString: string) => {
    try {
      setError(null);

      const importedEntries = parseYaml(yamlString);

      if (!importedEntries || Object.keys(importedEntries).length === 0) {
        throw new Error("No valid entries found in YAML");
      }

      setEntries(importedEntries);
      setActiveEntry(Object.keys(importedEntries)[0]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error importing YAML: ${errorMsg}`);
      console.error("Error importing YAML:", e);
    }
  }, []);

  // Export entries to a YAML string
  const exportToYaml = useCallback((): string => {
    try {
      setError(null);

      if (Object.keys(entries).length === 0) {
        return "";
      }

      return generateYaml(entries);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error exporting YAML: ${errorMsg}`);
      console.error("Error exporting YAML:", e);
      return "";
    }
  }, [entries]);

  // Import a single spintax string as a new entry
  const importSingleSpintax = useCallback(
    (spintax: string, customKey?: string): string => {
      try {
        setError(null);

        // Generate a key for the new entry
        const key = customKey || `spintax_${Date.now()}`;

        // Clear existing entries and set the new one
        setEntries({ [key]: spintax });
        setActiveEntry(key);

        return key;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        setError(`Error importing spintax: ${errorMsg}`);
        console.error("Error importing spintax:", e);
        return "";
      }
    },
    []
  );

  // Load demo data
  const loadDemo = useCallback(() => {
    try {
      setError(null);
      const demoEntries = parseYaml(exampleYaml);

      if (!demoEntries || Object.keys(demoEntries).length === 0) {
        throw new Error(
          "No valid entries found in demo data. Check presets.ts."
        );
      }

      setEntries(demoEntries);
      setActiveEntry(Object.keys(demoEntries)[0]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Unknown error";
      setError(`Error loading demo: ${errorMsg}`);
      console.error("Demo loading error:", e);
    }
  }, []);

  // Handler for importing data from modal
  const handleImport = useCallback(
    ({
      singleSpintax,
      yamlEntries,
    }: {
      singleSpintax?: string;
      yamlEntries?: YamlEntries;
    }) => {
      try {
        setError(null);
        let firstKey: string | null = null;

        if (singleSpintax !== undefined) {
          // Generate a unique key for single spintax import
          const key = `spintax_${Date.now()}`;
          setEntries({ [key]: singleSpintax });
          firstKey = key;
        } else if (yamlEntries && Object.keys(yamlEntries).length > 0) {
          setEntries(yamlEntries);
          firstKey = Object.keys(yamlEntries)[0];
        } else {
          console.warn("Import handler called with no data.");
          return;
        }

        setActiveEntry(firstKey);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        setError(`Import processing error: ${errorMsg}`);
        console.error("Import handling error:", e);
      }
    },
    []
  );

  return {
    entries,
    activeEntry,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    setActiveEntry,
    importFromYaml,
    exportToYaml,
    importSingleSpintax,
    loadDemo,
    handleImport,
  };
};
