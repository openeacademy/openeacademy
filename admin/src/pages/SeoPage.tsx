import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Search, Globe, Edit3, X } from 'lucide-react';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';

export default function SeoPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSeo, setEditingSeo] = useState<any>(null);

  const [form, setForm] = useState({
    title: '', description: '', keywords: '', canonical: '', ogTitle: '', ogDescription: '', robots: 'index,follow'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seo', page, limit, search],
    queryFn: () => apiGet(`/admin/seo?page=${page}&limit=${limit}&search=${search}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/admin/seo/${editingSeo.id}`, { ...data, keywords: data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) }),
    onSuccess: () => {
      toast.success('SEO Metadata updated');
      queryClient.invalidateQueries({ queryKey: ['admin-seo'] });
      setIsDrawerOpen(false);
      setEditingSeo(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update')
  });

  const handleEdit = (seo: any) => {
    setEditingSeo(seo);
    setForm({
      title: seo.title || '',
      description: seo.description || '',
      keywords: seo.keywords?.join(', ') || '',
      canonical: seo.canonical || '',
      ogTitle: seo.ogTitle || '',
      ogDescription: seo.ogDescription || '',
      robots: seo.robots || 'index,follow'
    });
    setIsDrawerOpen(true);
  };

  const seoData = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary-600" /> SEO Manager
          </h1>
          <p className="text-sm text-gray-500">Manage Search Engine Optimization metadata</p>
        </div>
      </div>

      <div className="card">
        <AdminTableHeader
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search SEO records..."
          onLimitChange={setLimit}
          limit={limit}
        />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-y border-gray-200">
              <tr>
                <th className="px-6 py-4">Resource ID</th>
                <th className="px-6 py-4">Title Tag</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Robots</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : seoData.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No SEO data found</td></tr>
              ) : (
                seoData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {item.examId ? `Exam: ${item.examId.substring(0,8)}` : item.pdfId ? `PDF: ${item.pdfId.substring(0,8)}` : `Quiz: ${item.quizId?.substring(0,8)}`}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]">{item.title || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-[250px]">{item.description || '-'}</td>
                    <td className="px-6 py-4"><span className="badge badge-gray">{item.robots}</span></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 p-2">
                        <Edit3 className="w-4 h-4" />
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

      <SlideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Edit SEO Metadata">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title Tag</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="SEO Title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field min-h-[80px]" placeholder="SEO Description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
            <input type="text" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} className="input-field" placeholder="keyword1, keyword2..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
            <input type="text" value={form.ogTitle} onChange={e => setForm({...form, ogTitle: e.target.value})} className="input-field" placeholder="Open Graph Title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Robots</label>
            <input type="text" value={form.robots} onChange={e => setForm({...form, robots: e.target.value})} className="input-field" placeholder="index,follow" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1 justify-center">
              {updateMutation.isPending ? 'Saving...' : 'Save SEO Data'}
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}
