import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';
import {
  CheckSquare, Plus, Edit3, Trash2, CheckCircle2, XCircle,
  AlertCircle, X, HelpCircle, Check, BookOpen, Download, FileSpreadsheet,
  FolderPlus, Tag
} from 'lucide-react';

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Creation Modals
  const [creationMode, setCreationMode] = useState<'none' | 'manual' | 'bulk'>('none');
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    categoryId: '',
    questionText: '',
    difficulty: 'MEDIUM',
    marks: 1,
    negativeMarks: 0.25,
    explanation: '',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
  });

  // Bulk Import State
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiGet<any[]>('/admin/categories'),
  });
  const categories = categoriesData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-questions-bank', page, limit, search, categoryFilter, difficultyFilter],
    queryFn: () => apiGet<any>(`/admin/questions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&categoryId=${categoryFilter !== 'all' ? categoryFilter : ''}&difficulty=${difficultyFilter !== 'all' ? difficultyFilter : ''}`),
  });

  const questions = data?.data || [];
  const total = data?.meta?.total || 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-questions-bank'] });
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-question-bank-for-quiz'] });
  };

  const createCategoryMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/admin/categories', payload),
    onSuccess: (res: any) => {
      invalidateAll(); setIsCategoryModalOpen(false); setNewCatName(''); setNewCatDesc('');
      if (res?.data?.id) setFormData(prev => ({ ...prev, categoryId: res.data.id }));
      toast.success('Category created!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/categories/${id}`),
    onSuccess: () => { invalidateAll(); if (categoryFilter !== 'all') setCategoryFilter('all'); toast.success('Category deleted!'); },
    onError: (err: any) => toast.error(err?.message || 'Failed'),
  });

  const createQuestionMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/admin/questions', payload),
    onSuccess: () => { invalidateAll(); closeForm(); toast.success('Question added!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (payload: any) => apiPut(`/admin/questions/${editingQuestion?.id}`, payload),
    onSuccess: () => { invalidateAll(); closeForm(); toast.success('Question updated!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/admin/questions/bulk', payload),
    onSuccess: () => { invalidateAll(); closeForm(); toast.success('Questions imported!'); },
    onError: (err: any) => { setFormError(err?.message || 'Bulk import failed'); },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/questions/${id}`),
    onSuccess: () => { invalidateAll(); setSelectedIds([]); setDeleteConfirm(null); toast.success('Deleted!'); },
    onError: (err: any) => toast.error(err?.message || 'Failed'),
  });

  const openCreateManual = () => {
    setEditingQuestion(null);
    setFormData({ categoryId: categories[0]?.id || '', questionText: '', difficulty: 'MEDIUM', marks: 1, negativeMarks: 0.25, explanation: '', options: [{ optionText: '', isCorrect: true }, { optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }] });
    setFormError(''); setCreationMode('manual');
  };

  const openEdit = (q: any) => {
    setEditingQuestion(q);
    setFormData({ categoryId: q.categoryId || q.category?.id || '', questionText: q.questionText || '', difficulty: q.difficulty || 'MEDIUM', marks: q.marks || 1, negativeMarks: q.negativeMarks || 0.25, explanation: q.explanation || '', options: q.options && q.options.length >= 4 ? q.options.map((o: any) => ({ optionText: o.optionText || '', isCorrect: Boolean(o.isCorrect) })) : [{ optionText: q.options?.[0]?.optionText || '', isCorrect: Boolean(q.options?.[0]?.isCorrect) }, { optionText: q.options?.[1]?.optionText || '', isCorrect: Boolean(q.options?.[1]?.isCorrect) }, { optionText: q.options?.[2]?.optionText || '', isCorrect: Boolean(q.options?.[2]?.isCorrect) }, { optionText: q.options?.[3]?.optionText || '', isCorrect: Boolean(q.options?.[3]?.isCorrect) }] });
    setFormError(''); setCreationMode('manual');
  };

  const openBulkImport = () => { setBulkCategoryId(categories[0]?.id || ''); setBulkText(''); setBulkFile(null); setFormError(''); setCreationMode('bulk'); };
  const closeForm = () => { setCreationMode('none'); setEditingQuestion(null); setFormError(''); };

  const handleManualSave = () => {
    if (!formData.questionText.trim()) { setFormError('Question prompt is required.'); return; }
    if (!formData.options.some(o => o.optionText.trim())) { setFormError('Please enter text for options.'); return; }
    if (editingQuestion) updateQuestionMutation.mutate(formData); else createQuestionMutation.mutate(formData);
  };

  const downloadSampleTemplate = () => {
    const csv = ['Question*,Option A*,Option B*,Option C*,Option D*,Correct Answer*,Explanation,Difficulty,Marks,Penalty', '"What is the capital of France?","Paris","London","Berlin","Madrid","Paris","Paris is the capital of France","EASY",1,0.25', '"Which is a prime number?","4","6","7","9","7","7 is prime","MEDIUM",1,0.25'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'question_bank_template.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const parseCSVLine = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^[\"']|[\"']$/g, '').trim().toLowerCase());
    const isHeader = headers.some(h => h.includes('question') || h.includes('option') || h.includes('correct'));
    const start = isHeader ? 1 : 0;
    const optAIdx = headers.findIndex(h => h.includes('option a') || h === 'optiona' || h === 'a');
    const optBIdx = headers.findIndex(h => h.includes('option b') || h === 'optionb' || h === 'b');
    const optCIdx = headers.findIndex(h => h.includes('option c') || h === 'optionc' || h === 'c');
    const optDIdx = headers.findIndex(h => h.includes('option d') || h === 'optiond' || h === 'd');
    const hasSep = optAIdx !== -1 && optBIdx !== -1;
    let qIdx = headers.findIndex(h => h.includes('question') || h.includes('prompt')); if (qIdx === -1) qIdx = 0;
    let ansIdx = headers.findIndex(h => h.includes('correct') || h.includes('answer')); if (ansIdx === -1) ansIdx = hasSep ? 5 : 2;
    let expIdx = headers.findIndex(h => h.includes('explanation')); if (expIdx === -1) expIdx = 6;
    let diffIdx = headers.findIndex(h => h.includes('difficulty')); if (diffIdx === -1) diffIdx = 7;
    let marksIdx = headers.findIndex(h => h.includes('mark')); if (marksIdx === -1) marksIdx = 8;
    let penIdx = headers.findIndex(h => h.includes('penalty') || h.includes('negative')); if (penIdx === -1) penIdx = 9;

    const parseRow = (str: string) => { const res: string[] = []; let curr = ''; let inQ = false; for (const ch of str) { if (ch === '"' || ch === "'") inQ = !inQ; else if (ch === ',' && !inQ) { res.push(curr.trim().replace(/^[\"']|[\"']$/g, '')); curr = ''; } else curr += ch; } res.push(curr.trim().replace(/^[\"']|[\"']$/g, '')); return res; };

    return lines.slice(start).map((line, li) => {
      const row = parseRow(line);
      const questionText = row[qIdx] || `Q${li + 1}`;
      const rawCorrect = (row[ansIdx] || '').trim();
      let optionTexts = hasSep ? [row[optAIdx], row[optBIdx], optCIdx !== -1 ? row[optCIdx] : '', optDIdx !== -1 ? row[optDIdx] : ''].filter(Boolean) : (row[1] ? [row[1], row[2], row[3], row[4]].filter(Boolean) : ['Option A', 'Option B', 'Option C', 'Option D']);
      const options = optionTexts.map((opt, idx) => ({ optionText: opt, isCorrect: rawCorrect.toLowerCase() === opt.toLowerCase() || rawCorrect === String(idx + 1) || rawCorrect.toLowerCase() === String.fromCharCode(97 + idx) || (idx === 0 && !rawCorrect) }));
      const marks = parseFloat(row[marksIdx]) || 1;
      const negativeMarks = parseFloat(row[penIdx]) || 0;
      return { questionText, explanation: row[expIdx] || null, difficulty: (row[diffIdx]?.toUpperCase() || 'MEDIUM'), marks, negativeMarks, options };
    }).filter(q => q.questionText);
  };

  const handleBulkSubmit = () => {
    if (!bulkText.trim() && !bulkFile) { setFormError('Please paste CSV or choose a file.'); return; }
    if (bulkFile) {
      const reader = new FileReader();
      reader.onload = e => { const parsed = parseCSVLine(e.target?.result as string); if (!parsed.length) { setFormError('No valid rows parsed.'); return; } bulkImportMutation.mutate({ categoryId: bulkCategoryId || undefined, questions: parsed }); };
      reader.readAsText(bulkFile);
    } else {
      const parsed = parseCSVLine(bulkText);
      if (!parsed.length) { setFormError('No valid rows parsed.'); return; }
      bulkImportMutation.mutate({ categoryId: bulkCategoryId || undefined, questions: parsed });
    }
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? questions.map((q: any) => q.id) : []);
  const handleSelectRow = (id: string, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  const handleBulkDelete = async () => { if (!confirm(`Delete ${selectedIds.length} questions?`)) return; for (const id of selectedIds) await deleteQuestionMutation.mutateAsync(id); setSelectedIds([]); };

  const DIFF_COLORS: Record<string, string> = { EASY: 'bg-emerald-100 text-emerald-800', MEDIUM: 'bg-amber-100 text-amber-800', HARD: 'bg-rose-100 text-rose-800' };

  return (
    <div className="space-y-6 pb-16">
      <AdminTableHeader
        title="Question Bank"
        subtitle="Organize, author, and bulk-import MCQ questions linked to categories"
        search={search} onSearchChange={setSearch} searchPlaceholder="Search questions..."
        onCreate={openCreateManual} createLabel="Add Question"
        limit={limit} onLimitChange={setLimit}
        selectedCount={selectedIds.length} onBulkDelete={handleBulkDelete}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none">
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name} ({cat._count?.questions || 0})</option>)}
            </select>
            <select value={difficultyFilter} onChange={e => { setDifficultyFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none">
              <option value="all">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
            <button onClick={() => setIsCategoryModalOpen(true)} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200">
              <FolderPlus className="w-3.5 h-3.5" /> Manage Categories
            </button>
            <button onClick={openBulkImport} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-200">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk Import
            </button>
            <button onClick={downloadSampleTemplate} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-gray-200">
              <Download className="w-3.5 h-3.5" /> Template CSV
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading question bank...</div>
        ) : questions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">No Questions Found</h3>
            <div className="flex items-center justify-center gap-3">
              <button onClick={openCreateManual} className="btn-primary"><Plus className="w-4 h-4" /> Manual</button>
              <button onClick={openBulkImport} className="btn-secondary"><FileSpreadsheet className="w-4 h-4" /> Bulk Import</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10"><input type="checkbox" checked={selectedIds.length === questions.length && questions.length > 0} onChange={e => handleSelectAll(e.target.checked)} className="rounded border-gray-300 text-primary-600" /></th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Question & Options</th>
                  <th className="py-3.5 px-4 text-center">Difficulty</th>
                  <th className="py-3.5 px-4 text-center">Marks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {questions.map((q: any) => (
                  <tr key={q.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 align-top pt-5"><input type="checkbox" checked={selectedIds.includes(q.id)} onChange={e => handleSelectRow(q.id, e.target.checked)} className="rounded border-gray-300 text-primary-600" /></td>
                    <td className="py-4 px-4 align-top pt-5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                        <Tag className="w-3 h-3" />{q.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2 max-w-2xl">
                        <p className="font-bold text-gray-900 leading-snug">{q.questionText}</p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {q.options?.map((opt: any, idx: number) => (
                            <div key={opt.id || idx} className={`px-3 py-1.5 rounded-xl border flex items-center justify-between ${opt.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                              <span className="truncate">{String.fromCharCode(65 + idx)}. {opt.optionText}</span>
                              {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                        {q.explanation && <p className="text-[11px] text-indigo-600 italic bg-indigo-50/50 px-2.5 py-1 rounded-lg">💡 {q.explanation}</p>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center align-top pt-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${DIFF_COLORS[q.difficulty] || 'bg-gray-100 text-gray-700'}`}>{q.difficulty}</span>
                    </td>
                    <td className="py-4 px-4 text-center align-top pt-5">
                      <p className="text-xs font-bold text-emerald-700">+{q.marks}</p>
                      <p className="text-[11px] font-semibold text-rose-600">-{q.negativeMarks}</p>
                    </td>
                    <td className="py-4 px-4 text-right align-top pt-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(q)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-gray-500 transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(q)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-gray-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            <h3 className="font-bold text-gray-900 mb-2">Delete this question?</h3>
            <p className="text-sm text-gray-500 mb-5 line-clamp-2">{deleteConfirm.questionText}</p>
            <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button><button onClick={() => deleteQuestionMutation.mutate(deleteConfirm.id)} className="btn-danger flex-1">Delete</button></div>
          </div>
        </div>
      )}

      {/* Category Manager Drawer */}
      <SlideDrawer isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}
        title="Question Categories" subtitle="Manage sets, classes, and topic groups"
        icon={<FolderPlus className="w-5 h-5" />} width="max-w-lg"
        footer={<div className="flex justify-end"><button onClick={() => setIsCategoryModalOpen(false)} className="btn-secondary">Done</button></div>}>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-gray-800">Add New Category</p>
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category Name..." className="input" />
          <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)" className="input" />
          <div className="flex justify-end">
            <button onClick={() => { if (!newCatName.trim()) return; createCategoryMutation.mutate({ name: newCatName, description: newCatDesc }); }} disabled={createCategoryMutation.isPending}
              className="btn-primary text-xs">
              {createCategoryMutation.isPending ? 'Creating...' : '+ Save Category'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 uppercase mb-2">Existing Categories ({categories.length})</p>
          {categories.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No categories yet.</p> : (
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat._count?.questions || 0} questions</p>
                  </div>
                  <button onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCategoryMutation.mutate(cat.id); }} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideDrawer>

      {/* Manual Create / Edit Drawer */}
      <SlideDrawer isOpen={creationMode === 'manual'} onClose={closeForm}
        title={editingQuestion ? 'Edit Question' : 'Add New Question'}
        subtitle="Single MCQ saved to global question bank"
        icon={<CheckSquare className="w-5 h-5" />}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeForm} className="btn-secondary">Cancel</button>
            <button onClick={handleManualSave} disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending} className="btn-primary">
              {createQuestionMutation.isPending || updateQuestionMutation.isPending ? 'Saving...' : editingQuestion ? 'Update Question' : 'Save to Bank'}
            </button>
          </div>
        }>
        {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}</div>}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Category *</label>
            <button onClick={() => setIsCategoryModalOpen(true)} className="text-xs text-indigo-600 font-bold hover:underline">+ New Category</button>
          </div>
          <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="input">
            <option value="">Select Category...</option>
            {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Question Prompt *</label>
          <textarea rows={3} value={formData.questionText} onChange={e => setFormData({ ...formData, questionText: e.target.value })} placeholder="Enter clear, concise question..." className="input resize-none" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Difficulty</label>
            <select value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })} className="input">
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="label">Marks (+)</label>
            <input type="number" step="0.5" value={formData.marks} onChange={e => setFormData({ ...formData, marks: parseFloat(e.target.value) || 1 })} className="input" />
          </div>
          <div>
            <label className="label">Penalty (-)</label>
            <input type="number" step="0.05" value={formData.negativeMarks} onChange={e => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) || 0 })} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Answer Options <span className="text-gray-400 font-normal">(click letter to mark correct)</span></label>
          <div className="space-y-2">
            {formData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, options: formData.options.map((o, i) => ({ ...o, isCorrect: i === idx })) })}
                  className={`w-8 h-8 rounded-xl font-bold text-xs shrink-0 transition-colors ${opt.isCorrect ? 'bg-emerald-500 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                  {String.fromCharCode(65 + idx)}
                </button>
                <input type="text" value={opt.optionText} onChange={e => { const opts = [...formData.options]; opts[idx].optionText = e.target.value; setFormData({ ...formData, options: opts }); }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`} className={`input flex-1 ${opt.isCorrect ? 'border-emerald-300 bg-emerald-50' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Explanation (optional)</label>
          <textarea rows={2} value={formData.explanation} onChange={e => setFormData({ ...formData, explanation: e.target.value })} placeholder="Step-by-step solution..." className="input resize-none" />
        </div>
      </SlideDrawer>

      {/* Bulk Import Drawer */}
      <SlideDrawer isOpen={creationMode === 'bulk'} onClose={closeForm}
        title="Bulk Import Questions"
        subtitle="Upload CSV or paste content — dynamic column matching"
        icon={<FileSpreadsheet className="w-5 h-5" />}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeForm} className="btn-secondary">Cancel</button>
            <button onClick={handleBulkSubmit} disabled={bulkImportMutation.isPending} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              {bulkImportMutation.isPending ? 'Importing...' : 'Process & Import'}
            </button>
          </div>
        }>
        {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formError}</div>}

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-900">Expected CSV Format</p>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">Question*, Option A*, B*, C*, D*, Correct*, Explanation, Difficulty, Marks, Penalty</p>
          </div>
          <button onClick={downloadSampleTemplate} className="shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Target Category</label>
            <button onClick={() => setIsCategoryModalOpen(true)} className="text-xs text-indigo-600 font-bold hover:underline">+ New Category</button>
          </div>
          <select value={bulkCategoryId} onChange={e => setBulkCategoryId(e.target.value)} className="input">
            <option value="">Select Category...</option>
            {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Upload CSV File</label>
          <input type="file" accept=".csv,.txt" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700" />
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200" /><span className="flex-shrink mx-4 text-xs font-bold text-gray-400 uppercase">or paste CSV content</span><div className="flex-grow border-t border-gray-200" />
        </div>

        <div>
          <textarea rows={6} value={bulkText} onChange={e => setBulkText(e.target.value)}
            placeholder={`Question*,Option A*,Option B*,Option C*,Option D*,Correct Answer*,Explanation,Difficulty,Marks,Penalty\n"What is 2+2?","2","3","4","5","4","Basic math","EASY",1,0.25`}
            className="input resize-none font-mono text-xs" />
        </div>
      </SlideDrawer>
    </div>
  );
}
