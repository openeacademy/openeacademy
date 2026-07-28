import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/api';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';
import ImageUploadField from '../components/shared/ImageUploadField';
import {
  BookOpen, Edit3, Copy, Trash2, Globe, Plus, X, CheckCircle2,
  XCircle, Layers, FileText, Trophy, Users, AlertCircle, Star, Palette
} from 'lucide-react';

const COLOR_PRESETS = [
  '#2563EB', '#7C3AED', '#DC2626', '#D97706', '#059669',
  '#0891B2', '#4F46E5', '#BE185D', '#374151', '#1D4ED8',
];

const defaultForm = () => ({
  name: '', slug: '', description: '', banner: '', icon: '',
  color: '#2563EB', sortOrder: 0, isFeatured: false, isActive: true,
  subjects: [] as string[], newSubjectInput: '',
  seo: { title: '', description: '', keywords: '', canonical: '', ogImage: '' },
});

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'seo'>('general');
  const [formData, setFormData] = useState(defaultForm());
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-exams', page, limit, search, statusFilter],
    queryFn: () => apiGet<any>(`/exams/admin/all?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${statusFilter}`),
  });

  const exams = data?.data || [];
  const total = data?.meta?.total || 0;

  const createMutation = useMutation({
    mutationFn: (p: any) => apiPost('/exams', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); closeDrawer(); toast.success('Exam created!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); toast.error('Create failed'); },
  });
  const updateMutation = useMutation({
    mutationFn: (p: any) => apiPut(`/exams/${editingExam.id}`, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); closeDrawer(); toast.success('Exam updated!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); toast.error('Update failed'); },
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/exams/${id}/duplicate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Exam duplicated'); },
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/exams/${id}/toggle-status`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/exams/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); toast.success('Exam deleted'); setDeleteConfirm(null); },
  });

  const openCreate = () => {
    setEditingExam(null); setFormData(defaultForm()); setFormError(''); setActiveTab('general'); setDrawerOpen(true);
  };
  const openEdit = (exam: any) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name || '', slug: exam.slug || '', description: exam.description || '',
      banner: exam.banner || '', icon: exam.icon || '', color: exam.color || '#2563EB',
      sortOrder: exam.sortOrder || 0, isFeatured: exam.isFeatured || false, isActive: exam.isActive ?? true,
      subjects: [], newSubjectInput: '',
      seo: { title: exam.seo?.title || '', description: exam.seo?.description || '', keywords: Array.isArray(exam.seo?.keywords) ? exam.seo.keywords.join(', ') : '', canonical: exam.seo?.canonical || '', ogImage: exam.seo?.ogImage || '' },
    });
    setFormError(''); setActiveTab('general'); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingExam(null); };

  const handleNameChange = (name: string) => setFormData(prev => ({
    ...prev, name, slug: editingExam ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  }));

  const handleSave = (isDraft: boolean) => {
    if (!formData.name.trim() || !formData.slug.trim()) { setFormError('Name and Slug are required.'); return; }
    const payload = {
      name: formData.name.trim(), slug: formData.slug.trim(), description: formData.description,
      banner: formData.banner || null, icon: formData.icon || null, color: formData.color,
      sortOrder: Number(formData.sortOrder) || 0, isFeatured: formData.isFeatured,
      isActive: !isDraft && formData.isActive, subjects: formData.subjects,
      seo: { title: formData.seo.title || formData.name, description: formData.seo.description || formData.description, keywords: formData.seo.keywords ? formData.seo.keywords.split(',').map(k => k.trim()).filter(Boolean) : [], canonical: formData.seo.canonical || null, ogImage: formData.seo.ogImage || formData.banner || null },
    };
    if (editingExam) updateMutation.mutate(payload); else createMutation.mutate(payload);
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? exams.map((e: any) => e.id) : []);
  const handleSelectRow = (id: string, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected exams?`)) return;
    for (const id of selectedIds) await deleteMutation.mutateAsync(id);
    setSelectedIds([]);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-16">
      <AdminTableHeader
        title="Exam Management"
        subtitle="Configure top-level exams, study categories, and SEO tags"
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search exams by name or slug..."
        onCreate={openCreate} createLabel="Add Exam"
        limit={limit} onLimitChange={setLimit}
        selectedCount={selectedIds.length} onBulkDelete={handleBulkDelete}
        filters={
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">No Exams Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">Create your first exam to organize subjects and content.</p>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Exam
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === exams.length && exams.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                  </th>
                  <th className="py-3.5 px-4">Exam & Slug</th>
                  <th className="py-3.5 px-4 text-center">Subjects</th>
                  <th className="py-3.5 px-4 text-center">PDFs</th>
                  <th className="py-3.5 px-4 text-center">Quizzes</th>
                  <th className="py-3.5 px-4 text-center">Users</th>
                  <th className="py-3.5 px-4 text-center">Sort</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {exams.map((exam: any) => (
                  <tr key={exam.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <input type="checkbox" checked={selectedIds.includes(exam.id)}
                        onChange={e => handleSelectRow(exam.id, e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: exam.color || '#2563EB' }}>
                          {exam.icon ? <img src={exam.icon} alt="" className="w-8 h-8 object-contain" /> : exam.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">
                            {exam.name}
                            {exam.isFeatured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">/{exam.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700">
                        <Layers className="w-3.5 h-3.5 text-gray-500" /> {exam._count?.subjects || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <FileText className="w-3.5 h-3.5" /> {exam._count?.pdfs || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <Trophy className="w-3.5 h-3.5" /> {exam._count?.quizzes || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <Users className="w-3.5 h-3.5" /> {exam.activeEnrolledCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-gray-600 font-semibold">
                      #{exam.sortOrder}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => toggleMutation.mutate(exam.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${exam.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {exam.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {exam.isActive ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(exam)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-gray-500 transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => duplicateMutation.mutate(exam.id)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-gray-500 transition-colors" title="Duplicate">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(exam)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-gray-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminPagination page={page} limit={limit} total={total} onPageChange={setPage} />

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Delete "{deleteConfirm.name}"?</h3>
            <p className="text-sm text-gray-500 mb-5">This will soft-delete the exam. All subjects and content remain but will be hidden.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Slide Drawer */}
      <SlideDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={editingExam ? `Edit: ${editingExam.name}` : 'Create New Exam'}
        subtitle="Configure exam settings, images, and SEO"
        icon={<BookOpen className="w-5 h-5" />}
        width="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={closeDrawer} className="btn-secondary">Cancel</button>
            <button onClick={() => handleSave(true)} disabled={isPending} className="btn-secondary bg-gray-800 text-white hover:bg-gray-900 border-gray-800">
              Save Draft
            </button>
            <button onClick={() => handleSave(false)} disabled={isPending} className="btn-primary">
              {isPending ? 'Saving...' : editingExam ? 'Update Exam' : 'Publish Exam'}
            </button>
          </div>
        }
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-100 -mt-2 -mx-0 mb-2">
          {(['general', 'seo'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {tab === 'seo' ? '🌐 SEO Meta' : '✏️ General'}
            </button>
          ))}
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{formError}
          </div>
        )}

        {activeTab === 'general' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Exam Name *</label>
                <input value={formData.name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. SSC CGL 2026" className="input" />
              </div>
              <div>
                <label className="label">URL Slug *</label>
                <input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                  placeholder="ssc-cgl-2026" className="input font-mono text-sm" />
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Comprehensive study series covering..." className="input resize-none" />
            </div>

            {/* Image fields */}
            <ImageUploadField label="Banner Image" value={formData.banner} onChange={v => setFormData(p => ({ ...p, banner: v }))}
              placeholder="https://... or upload" hint="Recommended: 1200×400px" />
            <ImageUploadField label="Icon / Logo" value={formData.icon} onChange={v => setFormData(p => ({ ...p, icon: v }))}
              placeholder="https://... or upload" hint="Recommended: 64×64px PNG/SVG" />

            <div>
              <label className="label flex items-center gap-2"><Palette className="w-3.5 h-3.5" />Theme Color</label>
              <div className="flex items-center gap-3 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => setFormData(p => ({ ...p, color: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-xl border-2 transition-transform ${formData.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`} />
                ))}
                <input type="color" value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 rounded-xl border border-gray-200 cursor-pointer p-0.5" title="Custom color" />
                <code className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{formData.color}</code>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Sort Order</label>
                <input type="number" value={formData.sortOrder} onChange={e => setFormData(p => ({ ...p, sortOrder: +e.target.value }))} className="input" />
              </div>
              <div className="flex flex-col justify-end gap-2 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData(p => ({ ...p, isFeatured: e.target.checked }))}
                    className="rounded text-primary-600 focus:ring-primary-500" />
                  Feature on Homepage
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500" />
                  Publish immediately
                </label>
              </div>
            </div>

            {!editingExam && (
              <div className="border-t border-gray-100 pt-4">
                <label className="label">Quick-Add Initial Subjects (optional)</label>
                <div className="flex gap-2 mb-2">
                  <input value={formData.newSubjectInput} onChange={e => setFormData(p => ({ ...p, newSubjectInput: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (formData.newSubjectInput.trim() && !formData.subjects.includes(formData.newSubjectInput.trim())) setFormData(p => ({ ...p, subjects: [...p.subjects, p.newSubjectInput.trim()], newSubjectInput: '' })); } }}
                    placeholder="e.g. Quantitative Aptitude" className="input flex-1" />
                  <button type="button" onClick={() => { if (formData.newSubjectInput.trim() && !formData.subjects.includes(formData.newSubjectInput.trim())) setFormData(p => ({ ...p, subjects: [...p.subjects, p.newSubjectInput.trim()], newSubjectInput: '' })); }}
                    className="btn-secondary shrink-0">+ Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.subjects.map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold">
                      {t}
                      <button type="button" onClick={() => setFormData(p => ({ ...p, subjects: p.subjects.filter(s => s !== t) }))} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Meta Title</label>
              <input value={formData.seo.title} onChange={e => setFormData(p => ({ ...p, seo: { ...p.seo, title: e.target.value } }))}
                placeholder={formData.name || 'SEO Meta Title'} className="input" />
            </div>
            <div>
              <label className="label">Meta Description</label>
              <textarea rows={3} value={formData.seo.description} onChange={e => setFormData(p => ({ ...p, seo: { ...p.seo, description: e.target.value } }))}
                placeholder="Best online study material..." className="input resize-none" />
            </div>
            <div>
              <label className="label">Keywords (comma-separated)</label>
              <input value={formData.seo.keywords} onChange={e => setFormData(p => ({ ...p, seo: { ...p.seo, keywords: e.target.value } }))}
                placeholder="ssc cgl, mock test, study notes" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Canonical URL</label>
                <input value={formData.seo.canonical} onChange={e => setFormData(p => ({ ...p, seo: { ...p.seo, canonical: e.target.value } }))}
                  placeholder="https://..." className="input font-mono text-xs" />
              </div>
              <div>
                <ImageUploadField 
                  label="OG Share Image URL" 
                  value={formData.seo.ogImage} 
                  onChange={v => setFormData(p => ({ ...p, seo: { ...p.seo, ogImage: v } }))} 
                  hint="Image for social sharing (1200x630px)"
                />
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
              <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">SEO Best Practices</p>
                <p className="text-blue-700 text-xs leading-relaxed">Meta title: 50-60 chars · Meta description: 150-160 chars · Include primary keyword in both.</p>
              </div>
            </div>
          </div>
        )}
      </SlideDrawer>
    </div>
  );
}
