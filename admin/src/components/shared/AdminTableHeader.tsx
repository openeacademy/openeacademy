import React from 'react';
import { Search, Download, Trash2, CheckCircle, XCircle, Filter } from 'lucide-react';

interface AdminTableHeaderProps {
  title: string;
  subtitle?: string;
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  onCreate?: () => void;
  createLabel?: string;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  selectedCount?: number;
  onBulkDelete?: () => void;
  onBulkPublish?: () => void;
  onBulkUnpublish?: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  filters?: React.ReactNode;
}

export default function AdminTableHeader({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  onCreate,
  createLabel = 'Create New',
  onExportCsv,
  onExportExcel,
  selectedCount = 0,
  onBulkDelete,
  onBulkPublish,
  onBulkUnpublish,
  limit,
  onLimitChange,
  filters,
}: AdminTableHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          )}
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-primary-200"
            >
              + {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-primary-50 border border-primary-200 px-4 py-2.5 rounded-xl">
          <span className="text-sm font-semibold text-primary-800">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {onBulkPublish && (
              <button
                onClick={onBulkPublish}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Publish Selected
              </button>
            )}
            {onBulkUnpublish && (
              <button
                onClick={onBulkUnpublish}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Unpublish Selected
              </button>
            )}
            {onBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
