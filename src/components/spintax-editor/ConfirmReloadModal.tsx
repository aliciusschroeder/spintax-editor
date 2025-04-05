"use client";
type ConfirmReloadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ConfirmReloadModal({ isOpen, onClose }: ConfirmReloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Reload Editor</h2>
        </div>

        {/* Body */}
        <div className="p-4 text-sm text-gray-700">
          <p>Are you sure you want to reload the editor?</p>
          <p className="mt-1 text-red-600 font-medium">This will erase all unsaved data.</p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            // onClick={() => router.refresh()}
            href="/" // TODO: Implement a solid editor reload function
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload
          </a>
        </div>
      </div>
    </div>
  );
}
