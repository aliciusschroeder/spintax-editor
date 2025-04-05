/**
 * Functions for generating YAML content from structured data
 */

import { YamlEntries } from "@/types";

/**
 * Generates a YAML string from a structured object
 *
 * Note: This is a simplified implementation for demonstration purposes.
 * In a production environment, consider using a dedicated YAML library.
 *
 * @param entries - The key-value pairs to convert to YAML
 * @returns A YAML-formatted string
 */
export const generateYaml = (entries: YamlEntries): string => {
  console.warn(
    "generateYaml is a simplified implementation and does not handle all YAML features."
  );

  return Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};
