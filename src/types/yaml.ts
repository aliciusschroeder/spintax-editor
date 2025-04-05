/**
 * Type definitions for YAML processing
 *
 * For this application, we use a simplified YAML structure
 * that consists of key-value pairs (string to string)
 */

/**
 * Represents the structure of YAML entries
 * Keys are entry identifiers, values are spintax content
 * Example: { "greeting": "Hello {world|everyone}!" }
 */
export type YamlEntries = Record<string, string>;
