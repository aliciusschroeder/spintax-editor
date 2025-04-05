/**
 * ImportExportModal Component
 *
 * Modal for importing spintax content or YAML and exporting YAML.
 * Provides text area for input and handles validation.
 */

import { exampleSpintax, exampleYaml } from "@/config/presets";
import { parseYaml } from "@/lib/yaml";
import { YamlEntries } from "@/types";
import { AlertCircle } from "lucide-react";
import React, { ChangeEvent, useEffect, useState } from "react";

/**
 * Props interface for the ImportExportModal component
 */
export interface ImportExportModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;

  /** Callback when the user closes the modal */
  onClose: () => void;

  /** Callback when the user imports data */
  onImport: (data: {
    singleSpintax?: string;
    yamlEntries?: YamlEntries;
  }) => void;
}

/**
 * Modal component for importing and exporting spintax content
 */
export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  // State for the text area content
  const [importText, setImportText] = useState<string>(exampleSpintax);

  // State for the selected import type
  const [importType, setImportType] = useState<"spintax" | "yaml">("spintax");

  // State for displaying errors during import
  const [error, setError] = useState<string | null>(null);

  // Handler for the main import button
  const handleImport = () => {
    try {
      setError(null); // Clear previous error

      if (importType === "spintax") {
        // Basic validation for spintax - check brace balance
        let balance = 0;
        for (const char of importText) {
          if (char === "{") balance++;
          else if (char === "}") balance--;
        }

        if (balance !== 0) {
          setError(
            "Warning: Spintax braces seem unbalanced. Importing anyway."
          );
        }

        onImport({ singleSpintax: importText });
      } else {
        // YAML import
        const entries = parseYaml(importText);

        if (!entries || Object.keys(entries).length === 0) {
          setError(
            "No valid entries found in YAML input. Please check format."
          );
          return;
        }

        onImport({ yamlEntries: entries });
      }

      onClose(); // Close the modal on successful import
    } catch (e: unknown) {
      console.error("Import error:", e);
      const errorMsg =
        e instanceof Error
          ? e.message
          : "An unknown error occurred during import";
      setError(`Error processing ${importType}: ${errorMsg}`);
    }
  };

  // Reset modal state when it opens or when import type changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setImportText(importType === "spintax" ? exampleSpintax : exampleYaml);
    }
  }, [isOpen, importType]);

  // Don't render anything if modal isn't open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Modal Content Box */}
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold">Import Content</h2>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 flex-1 overflow-auto">
          {/* Import Type Selection */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:space-x-4 mb-2">
              <label className="flex items-center cursor-pointer mb-1 sm:mb-0">
                <input
                  type="radio"
                  name="importType"
                  value="spintax"
                  checked={importType === "spintax"}
                  onChange={() => setImportType("spintax")}
                  className="mr-2"
                />
                Single Spintax
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  value="yaml"
                  checked={importType === "yaml"}
                  onChange={() => setImportType("yaml")}
                  className="mr-2"
                />
                YAML (Multiple Entries)
              </label>
            </div>

            {/* YAML Example (Conditional) */}
            {importType === "yaml" && (
              <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-sm rounded border border-blue-200">
                <p className="mb-1 font-medium">YAML Format Example:</p>
                <pre className="text-xs overflow-auto max-h-32 bg-white p-2 border rounded">
                  {exampleYaml}
                </pre>
              </div>
            )}

            {/* Import Text Area */}
            <textarea
              value={importText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setImportText(e.target.value)
              }
              className="w-full h-64 p-2 border rounded font-mono text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                importType === "spintax"
                  ? "Paste your spintax here..."
                  : "Paste your YAML content here..."
              }
              aria-label="Import content area"
            />
          </div>

          {/* Error Display Area */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span>{error}</span>
              {/* Dismiss button for the error */}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700 text-lg font-bold"
                aria-label="Dismiss error"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t flex justify-end space-x-2 flex-shrink-0 bg-gray-50">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          {/* Import Button */}
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!importText.trim()}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
