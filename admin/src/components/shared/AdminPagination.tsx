import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({
  page,
  limit,
  total,
  onPageChange,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(total, page * limit);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm mt-4 gap-4">
      <div className="text-sm font-medium text-gray-600">
        Showing <span className="font-bold text-gray-900">{startRow}</span> to{' '}
        <span className="font-bold text-gray-900">{endRow}</span> of{' '}
        <span className="font-bold text-gray-900">{total}</span> entries
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-semibold text-gray-800 px-3 py-1 bg-gray-100 rounded-lg">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
