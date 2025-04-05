/**
 * Functions for parsing YAML content into structured data
 */

import { YamlEntries } from "@/types";

/**
 * Parses a YAML string into a structured object
 *
 * Note: This is a simplified implementation for demonstration purposes.
 * In a production environment, consider using a dedicated YAML library.
 *
 * @param yamlString - The YAML content as a string
 * @returns A record of key-value pairs parsed from the YAML
 */
export const parseYaml = (yamlString: string): YamlEntries => {
  console.warn(
    "parseYaml is a simplified implementation and does not handle all YAML features."
  );

  // Basic line-by-line parsing for simple key-value pairs
  const lines = yamlString.split("\n");
  const entries: YamlEntries = {};

  lines.forEach((line) => {
    // Split on the first colon to separate key and value
    const parts = line.split(":");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      // Rejoin any values that might contain colons
      const value = parts.slice(1).join(":").trim();
      if (key && value) {
        entries[key] = value;
      }
    }
  });

  return entries;
};
