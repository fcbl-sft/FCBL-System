import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteStyleModalProps {
    isOpen: boolean;
    styleName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const DeleteStyleModal: React.FC<DeleteStyleModalProps> = ({
    isOpen,
    styleName,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Delete Style</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-gray-700 mb-4">
                        Are you sure you want to delete style <strong>"{styleName}"</strong>?
                    </p>
                    <p className="text-gray-600 text-sm mb-3">This will permanently delete:</p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4 mb-4">
                        <li>• Tech Pack</li>
                        <li>• Order Sheet</li>
                        <li>• Consumption</li>
                        <li>• PP Meeting</li>
                        <li>• All related data</li>
                    </ul>
                    <p className="text-red-600 text-sm font-medium">
                        This action cannot be undone.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteStyleModal;
