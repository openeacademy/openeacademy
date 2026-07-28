import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/api';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';
import ImageUploadField from '../components/shared/ImageUploadField';
import {
  FolderTree, Edit3, Copy, Trash2, Plus, X, CheckCircle2,
  XCircle, Layers, FileText, Trophy, AlertCircle, BookOpen, GripVertical
} from 'lucide-react';

const defaultForm = () => ({
  examId: '', name: '', slug: '', description: '', icon: '', coverImage: '', sortOrder: 0, isActive: true,
  topics: [] as { id?: string; name: string; description: string; sortOrder: number }[],
  newTopicName: '', newTopicDesc: '',
});

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [formData, setFormData] = useState(defaultForm());
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-dropdown'],
    queryFn: () => apiGet<any>('/exams/admin/all?limit=100'),
  });
  const exams = examsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subjects', page, limit, search, examFilter, statusFilter],
    queryFn: () => apiGet<any>(`/subjects/admin/all?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&examId=${examFilter}&status=${statusFilter}`),
  });

  const subjects = data?.data || [];
  const total = data?.meta?.total || 0;

  const createMutation = useMutation({
    mutationFn: (p: any) => apiPost('/subjects', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subjects'] }); closeDrawer(); toast.success('Subject created!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });
  const updateMutation = useMutation({
    mutationFn: (p: any) => apiPut(`/subjects/${editingSubject.id}`, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subjects'] }); closeDrawer(); toast.success('Subject updated!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/subjects/${id}/duplicate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subjects'] }); toast.success('Duplicated!'); },
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/subjects/${id}/toggle-status`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-subjects'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/subjects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subjects'] }); toast.success('Deleted'); setDeleteConfirm(null); },
  });

  const openCreate = () => { setEditingSubject(null); setFormData(defaultForm()); setFormError(''); setDrawerOpen(true); };
  const openEdit = (s: any) => {
    setEditingSubject(s);
    setFormData({ examId: s.examId || '', name: s.name || '', slug: s.slug || '', description: s.description || '', icon: s.icon || '', coverImage: s.coverImage || '', sortOrder: s.sortOrder || 0, isActive: s.isActive ?? true, topics: s.topics?.map((t: any) => ({ id: t.id, name: t.name, description: t.description || '', sortOrder: t.sortOrder })) || [], newTopicName: '', newTopicDesc: '' });
    setFormError(''); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingSubject(null); };

  const handleNameChange = (name: string) => setFormData(prev => ({
    ...prev, name, slug: editingSubject ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  }));

  const addTopic = () => {
    if (!formData.newTopicName.trim()) return;
    setFormData(p => ({ ...p, topics: [...p.topics, { name: p.newTopicName.trim(), description: p.newTopicDesc.trim(), sortOrder: p.topics.length + 1 }], newTopicName: '', newTopicDesc: '' }));
  };
  const removeTopic = (idx: number) => setFormData(p => ({ ...p, topics: p.topics.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!formData.name.trim() || !formData.slug.trim()) { setFormError('Name and Slug are required.'); return; }
    if (!formData.examId) { setFormError('Please select a parent exam.'); return; }
    const payload = { examId: formData.examId, name: formData.name.trim(), slug: formData.slug.trim(), description: formData.description, icon: formData.icon || null, coverImage: formData.coverImage || null, sortOrder: +formData.sortOrder, isActive: formData.isActive, topics: formData.topics };
    if (editingSubject) updateMutation.mutate(payload); else createMutation.mutate(payload);
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? subjects.map((s: any) => s.id) : []);
  const handleSelectRow = (id: string, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  const handleBulkDelete = async () => { if (!confirm(`Delete ${selectedIds.length} subjects?`)) return; for (const id of selectedIds) await deleteMutation.mutateAsync(id); setSelectedIds([]); };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-16">
      <AdminTableHeader
        title="Subject Management"
        subtitle="Manage subjects and topics within exams"
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search subjects..."
        onCreate={openCreate} createLabel="Add Subject"
        limit={limit} onLimitChange={setLimit}
        selectedCount={selectedIds.length} onBulkDelete={handleBulkDelete}
        filters={
          <div className="flex items-center gap-2">
            <select value={examFilter} onChange={e => { setExamFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Exams</option>
              {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading subjects...</div>
        ) : subjects.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">No Subjects Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">Create subjects to organise PDFs, quizzes, and questions under each exam.</p>
            <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Subject</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === subjects.length && subjects.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                  </th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Parent Exam</th>
                  <th className="py-3.5 px-4 text-center">Topics</th>
                  <th className="py-3.5 px-4 text-center">PDFs</th>
                  <th className="py-3.5 px-4 text-center">Quizzes</th>
                  <th className="py-3.5 px-4 text-center">Sort</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {subjects.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <input type="checkbox" checked={selectedIds.includes(sub.id)}
                        onChange={e => handleSelectRow(sub.id, e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                          {sub.icon ? <img src={sub.icon} alt="" className="w-7 h-7 object-contain" /> : <FolderTree className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{sub.name}</p>
                          <p className="text-xs text-gray-400 font-mono">/{sub.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {sub.exam?.icon && <img src={sub.exam.icon} alt="" className="w-5 h-5 rounded" />}
                        <span className="text-sm text-gray-700 font-medium">{sub.exam?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700">
                        <Layers className="w-3.5 h-3.5" />{sub._count?.topics || sub.topics?.length || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <FileText className="w-3.5 h-3.5" />{sub._count?.pdfs || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <Trophy className="w-3.5 h-3.5" />{sub._count?.quizzes || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-xs font-mono text-gray-600 font-semibold">#{sub.sortOrder}</td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => toggleMutation.mutate(sub.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${sub.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {sub.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {sub.isActive ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(sub)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-gray-500 transition-colors" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => duplicateMutation.mutate(sub.id)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-gray-500 transition-colors" title="Duplicate">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(sub)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-gray-500 transition-colors" title="Delete">
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Delete "{deleteConfirm.name}"?</h3>
            <p className="text-sm text-gray-500 mb-5">This will soft-delete this subject and hide it from students.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button><button onClick={() => deleteMutation.mutate(deleteConfirm.id)} className="btn-danger flex-1">Delete</button></div>
          </div>
        </div>
      )}

      {/* Slide Drawer */}
      <SlideDrawer
        isOpen={drawerOpen} onClose={closeDrawer}
        title={editingSubject ? `Edit: ${editingSubject.name}` : 'Create New Subject'}
        subtitle="Configure subject settings, icon, and topics"
        icon={<FolderTree className="w-5 h-5" />}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={closeDrawer} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={isPending} className="btn-primary">
              {isPending ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{formError}
          </div>
        )}

        {/* Parent Exam */}
        <div>
          <label className="label">Parent Exam *</label>
          <select value={formData.examId} onChange={e => setFormData(p => ({ ...p, examId: e.target.value }))} className="input">
            <option value="">— Select Exam —</option>
            {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Subject Name *</label>
            <input value={formData.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Quantitative Aptitude" className="input" />
          </div>
          <div>
            <label className="label">URL Slug *</label>
            <input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} className="input font-mono text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this subject..." className="input resize-none" />
        </div>

        <ImageUploadField label="Subject Icon" value={formData.icon} onChange={v => setFormData(p => ({ ...p, icon: v }))} hint="Recommended: 64×64px" />
        <ImageUploadField label="Cover Image" value={formData.coverImage} onChange={v => setFormData(p => ({ ...p, coverImage: v }))} hint="Recommended: 800×400px" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sort Order</label>
            <input type="number" value={formData.sortOrder} onChange={e => setFormData(p => ({ ...p, sortOrder: +e.target.value }))} className="input" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 pb-2">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="rounded text-emerald-600" />
              Publish immediately
            </label>
          </div>
        </div>

        {/* Topics */}
        <div className="border-t border-gray-100 pt-4">
          <label className="label text-base font-semibold">Topics</label>
          <div className="flex gap-2 mb-3">
            <input value={formData.newTopicName} onChange={e => setFormData(p => ({ ...p, newTopicName: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } }}
              placeholder="Topic name" className="input flex-1" />
            <input value={formData.newTopicDesc} onChange={e => setFormData(p => ({ ...p, newTopicDesc: e.target.value }))}
              placeholder="Description (optional)" className="input flex-1" />
            <button type="button" onClick={addTopic} className="btn-secondary shrink-0">+ Add</button>
          </div>

          {formData.topics.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No topics yet. Add topics above.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {formData.topics.map((topic, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{topic.name}</p>
                    {topic.description && <p className="text-xs text-gray-500">{topic.description}</p>}
                  </div>
                  <button type="button" onClick={() => removeTopic(idx)} className="p-1 text-gray-400 hover:text-rose-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideDrawer>
    </div>
  );
}
