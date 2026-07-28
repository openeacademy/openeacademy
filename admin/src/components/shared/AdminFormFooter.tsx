import React from 'react';
import { Save, Send, Trash2, History, X } from 'lucide-react';

interface AdminFormFooterProps {
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  saveLabel?: string;
  publishLabel?: string;
}

export default function AdminFormFooter({
  onSaveDraft,
  onPublish,
  onCancel,
  onDelete,
  onViewHistory,
  isSaving = false,
  isPublishing = false,
  saveLabel = 'Save as Draft',
  publishLabel = 'Publish Now',
}: AdminFormFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-gray-200 p-4 rounded-2xl shadow-md mt-8 gap-4 sticky bottom-4 z-20">
      <div className="flex items-center gap-3">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
          >
            <History className="w-4 h-4" /> Version History
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
        >
          <X className="w-4 h-4" /> Cancel
        </button>

        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : saveLabel}
          </button>
        )}

        {onPublish && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-primary-200 disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {isPublishing ? 'Publishing...' : publishLabel}
          </button>
        )}
      </div>
    </div>
  );
}
