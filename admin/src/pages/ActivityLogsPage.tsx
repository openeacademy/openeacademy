import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { Search, Activity, User, Clock } from 'lucide-react';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity-logs', page, limit, search, actionFilter],
    queryFn: () => apiGet(`/admin/activity-logs?page=${page}&limit=${limit}&search=${search}${actionFilter ? `&action=${actionFilter}` : ''}`),
  });

  const logs = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" /> Activity Logs
          </h1>
          <p className="text-sm text-gray-500">Monitor user and system activities</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-100 gap-4 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search user..."
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-full transition-all"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-2 outline-none"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="PDF_VIEW">PDF View</option>
              <option value="QUIZ_START">Quiz Start</option>
              <option value="SUBSCRIPTION_PURCHASE">Purchase</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-transparent font-medium text-gray-900 outline-none cursor-pointer"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-y border-gray-200">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No activity logs found</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                          {log.user?.name?.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{log.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{log.user?.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="badge badge-primary text-xs">{log.action}</span></td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{log.entityType || '-'} {log.entityId ? `(${log.entityId.substring(0,8)})` : ''}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <AdminPagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} totalItems={total} />
      </div>
    </div>
  );
}
