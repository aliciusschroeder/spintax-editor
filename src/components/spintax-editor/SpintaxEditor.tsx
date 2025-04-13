/**
 * SpintaxEditor Component (Refactored for advanced YAML handling)
 *
 * The main container component for the spintax editor application.
 * Manages multiple spintax entries, import/export functionality, and UI state.
 */

import editorLogo from "@/../public/logo.svg";
import { useYamlEntries } from "@/hooks";
import { AlertCircle, Copy, Download, FileCode, Upload } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import { ConfirmReloadModal } from "./ConfirmReloadModal";
import { ImportExportModal } from "./ImportExportModal";
import { SpintaxEditorTab } from "./SpintaxEditorTab";

/**
 * Main spintax editor component
 */
export const SpintaxEditor: React.FC = () => {
  // Use the YAML entries hook (refactored)
  const {
    entries,
    activeEntry,
    error,
    setActiveEntry,
    updateEntry,
    addEntry,
    loadDemo,
    importFromYaml,
    exportToYaml,
  } = useYamlEntries();

  // Modal states
  const [showConfirmReloadModal, setShowConfirmReloadModal] =
    useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [yamlExport, setYamlExport] = useState<string>("");
  const [showYamlExport, setShowYamlExport] = useState<boolean>(false);

  // Export to YAML
  const handleExportYaml = () => {
    try {
      const yaml = exportToYaml();
      setYamlExport(yaml);
      setShowYamlExport(true);
    } catch (err) {
      console.error("Export YAML error:", err);
    }
  };

  // Copy the exported YAML to clipboard
  const handleCopyYamlExport = () => {
    navigator.clipboard
      .writeText(yamlExport)
      .then(() => {
        // Optional success feedback could be added here
      })
      .catch((err) => {
        console.error("Failed to copy YAML export:", err);
      });
  };

  // Import handler for modal (supports legacy modal API)
  const handleImport = (data: {
    singleSpintax?: string;
    yamlEntries?: string;
  }) => {
    if (data.yamlEntries && typeof data.yamlEntries === "string") {
      importFromYaml(data.yamlEntries);
    } else if (data.singleSpintax) {
      // Optionally: show error or ignore, as single spintax import is not supported in new YAML system
      // setError("Single spintax import is not supported. Please use YAML format.");
    }
  };

  return (
    <div className="w-full flex flex-col bg-gray-100 text-gray-800 font-sans h-screen max-h-screen">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 shadow-md flex flex-wrap justify-between items-center flex-shrink-0 gap-2">
        {/* Title */}
        <a onClick={() => setShowConfirmReloadModal(true)}>
          <div className="flex flex-row items-center space-x-2 cursor-pointer">
            <div>
              <Image
                src={editorLogo}
                alt="Spintax Editor Logo"
                width={42}
                height={42}
                className="mr-2 pt-1"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">Spintax Editor</h1>
              <p className="text-xs opacity-80">
                Visual tree editor for spintax
              </p>
            </div>
          </div>
        </a>

        {/* Action Buttons */}
        <div className="flex space-x-2 flex-wrap gap-1">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-md flex items-center"
            title="Import Spintax or YAML"
          >
            <Upload size={14} className="mr-1" /> Import
          </button>

          {Object.keys(entries).length > 0 && (
            <button
              onClick={handleExportYaml}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-md flex items-center"
              title="Export all entries as YAML"
            >
              <Download size={14} className="mr-1" /> Export YAML
            </button>
          )}

          <button
            onClick={loadDemo}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-md flex items-center"
            title="Load example YAML data"
          >
            <FileCode size={14} className="mr-1" /> Load Demo
          </button>
        </div>
      </header>

      {/* Global Error Display Area */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 border-b border-red-300 flex-shrink-0">
          <div className="container mx-auto flex items-center text-sm">
            <AlertCircle size={16} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
            {/* Button to dismiss the error */}
            <button
              onClick={() => null /* Error is managed by the hook */}
              className="ml-auto text-red-500 hover:text-red-700 text-lg font-bold leading-none px-1"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area (Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Only show when entries exist */}
        {Object.keys(entries).length > 0 && (
          <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
            {/* Sidebar Header */}
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
              <h3 className="font-semibold text-sm uppercase">Entries</h3>
              {/* Add New Entry Button */}
              <button
                onClick={() => addEntry()}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Add New Entry"
                aria-label="Add new entry"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            {/* Scrollable List of Entries */}
            <div className="overflow-y-auto flex-1">
              {Object.keys(entries).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveEntry(key)}
                  className={`w-full text-left p-3 text-sm truncate block ${
                    activeEntry === key
                      ? "bg-blue-100 border-l-4 border-blue-500 font-medium text-blue-700"
                      : "hover:bg-gray-50 border-l-4 border-transparent text-gray-700"
                  }`}
                  title={key}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Editor/Welcome Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Conditionally render Editor Tab or Welcome message */}
          {activeEntry && entries[activeEntry] !== undefined ? (
            <SpintaxEditorTab
              key={activeEntry}
              initialSpintax={(() => {
                const { entry, arrayIndex } = entries[activeEntry];
                if (entry.type === "string") return entry.value;
                if (
                  entry.type === "stringArray" &&
                  typeof arrayIndex === "number"
                )
                  return entry.value[arrayIndex];
                return "";
              })()}
              onUpdate={(newContent) => updateEntry(activeEntry, newContent)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-gray-50">
              <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">
                  Welcome to the Spintax Editor
                </h2>
                {Object.keys(entries).length === 0 ? (
                  <p className="mb-4 text-gray-600">
                    Get started by importing spintax content or loading the demo
                    data.
                  </p>
                ) : (
                  <p className="mb-4 text-gray-600">
                    Select an entry from the sidebar to begin editing.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
                  >
                    <Upload size={16} className="mr-2" /> Import Content
                  </button>
                  <button
                    onClick={loadDemo}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center"
                  >
                    <FileCode size={16} className="mr-2" /> Load Demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Reload Modal */}
      <ConfirmReloadModal
        isOpen={showConfirmReloadModal}
        onClose={() => setShowConfirmReloadModal(false)}
      />

      {/* Import Modal */}
      <ImportExportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      {/* YAML Export Modal */}
      {showYamlExport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {/* Export Modal Content Box */}
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
            {/* Export Modal Header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-semibold">Export YAML</h2>
              {/* Close button */}
              <button
                onClick={() => setShowYamlExport(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close export modal"
              >
                &times;
              </button>
            </div>

            {/* Export Modal Body (Scrollable) */}
            <div className="p-4 flex-1 overflow-auto">
              {/* Read-only Textarea for YAML */}
              <textarea
                value={yamlExport}
                readOnly
                className="w-full h-64 p-2 border rounded font-mono text-sm bg-gray-50 focus:ring-0 focus:border-gray-300"
                aria-label="Exported YAML content"
              />
            </div>

            {/* Export Modal Footer */}
            <div className="p-4 border-t flex justify-end space-x-2 flex-shrink-0 bg-gray-50">
              {/* Copy to Clipboard Button */}
              <button
                onClick={handleCopyYamlExport}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
              >
                <Copy size={14} className="mr-2" /> Copy to Clipboard
              </button>
              {/* Close Button */}
              <button
                onClick={() => setShowYamlExport(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
