import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Bell, Plus, Trash2, Search } from 'lucide-react';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'IN_APP', category: 'ANNOUNCEMENT' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications', page, limit, search],
    queryFn: () => apiGet(`/admin/notifications?page=${page}&limit=${limit}&search=${search}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost('/admin/notifications', data),
    onSuccess: () => {
      toast.success('Notification created');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      setIsDrawerOpen(false);
      setForm({ title: '', message: '', type: 'IN_APP', category: 'ANNOUNCEMENT' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/notifications/${id}`),
    onSuccess: () => {
      toast.success('Notification deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
  });

  const notifications = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" /> Notifications
          </h1>
          <p className="text-sm text-gray-500">Manage system and push notifications</p>
        </div>
        <button onClick={() => setIsDrawerOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> New Notification
        </button>
      </div>

      <div className="card">
        <AdminTableHeader
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search notifications..."
          onLimitChange={setLimit}
          limit={limit}
        />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-y border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
              ) : notifications.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No notifications found</td></tr>
              ) : (
                notifications.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.title}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{item.message}</td>
                    <td className="px-6 py-4"><span className="badge badge-primary">{item.type}</span></td>
                    <td className="px-6 py-4"><span className="badge badge-gray">{item.category}</span></td>
                    <td className="px-6 py-4 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteMutation.mutate(item.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <AdminPagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} totalItems={total} />
      </div>

      <SlideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Notification">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="Notification Title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea required value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="input-field min-h-[100px]" placeholder="Notification message content..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field">
              <option value="IN_APP">In-App</option>
              <option value="PUSH">Push</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="OFFER">Offer</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
              {createMutation.isPending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}
