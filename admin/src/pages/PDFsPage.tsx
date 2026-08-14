import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/api';
import api from '../lib/api';
import { generateSlug } from '../lib/utils';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';
import ImageUploadField from '../components/shared/ImageUploadField';
import {
  FileText, Edit3, Copy, Trash2, Plus, X, CheckCircle2,
  XCircle, Eye, Download, Lock, Unlock, AlertCircle, BookOpen,
  FolderTree, Upload, Loader2, ZapOff, Zap, ExternalLink
} from 'lucide-react';

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.round(bytes / 1024) + ' KB';
};

const defaultForm = () => ({
  title: '', slug: '', description: '', author: 'OpenEAcademy Editorial',
  examId: '', subjectId: '', language: 'ENGLISH',
  fileUrl: '', thumbnailUrl: '', totalPages: 0, fileSize: 0,
  requiresSubscription: true, freePreviewPages: 3, allowDownload: false,
  watermarkText: 'OpenEAcademy Study Notes - Confidential',
  isActive: true, isFeatured: false,
});

// ─── PDF Compressor ───────────────────────────────────────────────────────────
// Client-side PDF compression is removed to preserve quality and reduce file size bloat.
// Original files are now uploaded directly, ensuring zero quality loss and keeping 
// the original optimal vector size intact.


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PDFsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPdf, setEditingPdf] = useState<any | null>(null);
  const [formData, setFormData] = useState(defaultForm());
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
  const [autoThumbnail, setAutoThumbnail] = useState(true);

  // Upload / compression
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProxyUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/api/v1/files/public/')) {
      return '/api/v1/files/public/' + url.split('/api/v1/files/public/')[1];
    }
    return url;
  };

  const { data: examsData } = useQuery({ queryKey: ['admin-exams-dropdown'], queryFn: () => apiGet<any>('/exams/admin/all?limit=100') });
  const exams = examsData?.data || [];

  const { data: formSubjectsData } = useQuery({
    queryKey: ['admin-form-subjects', formData.examId],
    queryFn: () => apiGet<any>(`/subjects/admin/all?limit=200&examId=${formData.examId}`),
    enabled: !!formData.examId,
  });
  const formSubjects: any[] = formSubjectsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pdfs', page, limit, search, examFilter, subjectFilter, accessFilter, statusFilter],
    queryFn: () => apiGet<any>(`/pdfs/admin/all?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&examId=${examFilter}&subjectId=${subjectFilter}&access=${accessFilter}&status=${statusFilter}`),
  });

  const pdfs = data?.data || [];
  const total = data?.meta?.total || 0;

  const createMutation = useMutation({
    mutationFn: (p: any) => apiPost('/pdfs/admin/json', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] }); closeDrawer(); toast.success('Study note created!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });
  const updateMutation = useMutation({
    mutationFn: (p: any) => apiPut(`/pdfs/${editingPdf.id}`, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] }); closeDrawer(); toast.success('Study note updated!'); },
    onError: (err: any) => { setFormError(err?.message || 'Failed'); },
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/pdfs/${id}/duplicate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] }); toast.success('Duplicated!'); },
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/pdfs/${id}/toggle-status`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/pdfs/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] }); toast.success('Deleted'); setDeleteConfirm(null); },
  });

  const openCreate = () => { setEditingPdf(null); setFormData(defaultForm()); setFormError(''); setSelectedFiles([]); setAutoThumbnail(true); setDrawerOpen(true); };
  const openEdit = (pdf: any) => {
    setEditingPdf(pdf);
    setFormData({ title: pdf.title || '', slug: pdf.slug || '', description: pdf.description || '', author: pdf.author || 'OpenEAcademy Editorial', examId: pdf.examId || '', subjectId: pdf.subjectId || '', language: pdf.language || 'ENGLISH', fileUrl: pdf.s3Key || '', thumbnailUrl: pdf.thumbnailUrl || '', totalPages: pdf.totalPages ?? 0, fileSize: pdf.fileSize || 0, requiresSubscription: pdf.requiresSubscription ?? true, freePreviewPages: pdf.freePreviewPages ?? 3, allowDownload: pdf.allowDownload ?? false, watermarkText: pdf.watermarkText || 'OpenEAcademy Study Notes - Confidential', isActive: pdf.isActive ?? true, isFeatured: pdf.isFeatured ?? false });
    setFormError(''); setSelectedFiles([]); setAutoThumbnail(true); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditingPdf(null); setSelectedFiles([]); };

  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);

    if (fileArray.length === 1) {
      const file = fileArray[0];
      setFormData(prev => ({ 
        ...prev, 
        fileUrl: file.name, 
        fileSize: file.size,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        slug: prev.slug || generateSlug(file.name.replace(/\.[^/.]+$/, ""))
      }));

      // Auto-count pages using pdf.js for single file
      try {
        const buf = await file.arrayBuffer();
        let pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          await new Promise<void>(resolve => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => resolve();
            document.head.appendChild(s);
          });
          pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        setFormData(prev => ({ ...prev, totalPages: pdfDoc.numPages }));
      } catch {}
    } else if (fileArray.length > 1) {
      setFormData(prev => ({ ...prev, title: `${fileArray.length} files selected`, slug: 'auto-generated-batch' }));
    }
  };

  const handleSave = async () => {
    if ((editingPdf || selectedFiles.length <= 1) && (!formData.title.trim() || !formData.slug.trim())) { 
      setFormError('Title and Slug are required.'); return; 
    }
    
    setIsUploading(true);
    setFormError('');

    try {
      const filesToProcess = selectedFiles.length > 0 ? selectedFiles : [null];
      
      for (const file of filesToProcess) {
        let payload = { ...formData };
        
        if (file) {
          const uploadFile = file;
          setCurrentProcessingFile(file.name);

          if (selectedFiles.length > 1) {
            payload.title = file.name.replace(/\.[^/.]+$/, "");
            payload.slug = generateSlug(payload.title);
          }

          // Accurately detect total pages using PDF.js for each document
          try {
            let pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
              await new Promise<void>(resolve => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                s.onload = () => resolve();
                document.head.appendChild(s);
              });
              pdfjsLib = (window as any).pdfjsLib;
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            const arrayBuf = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
            if (pdfDoc.numPages) {
              payload.totalPages = pdfDoc.numPages;
            }

            if (autoThumbnail && !payload.thumbnailUrl) {
              try {
                const page = await pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport: viewport }).promise;
                  
                  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                  if (blob) {
                    const thumbFd = new FormData();
                    thumbFd.append('file', new File([blob], uploadFile.name.replace(/\.[^/.]+$/, "") + "-thumb.jpg", { type: 'image/jpeg' }));
                    const thumbRes = await api.post<any>('/admin/upload-image', thumbFd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    if (thumbRes.data?.data?.url) {
                      payload.thumbnailUrl = thumbRes.data.data.url;
                    }
                  }
                }
              } catch (e) {
                console.warn('Failed to generate thumbnail:', e);
              }
            }
          } catch (e) {
            console.warn('PDF.js client page count warning:', e);
          }

          toast.loading(`Processing & Uploading ${uploadFile.name}...`, { id: 'upload_toast' });
          const fd = new FormData();
          fd.append('file', uploadFile);
          const res = await api.post<any>('/pdfs/admin/upload-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          toast.dismiss('upload_toast');
          
          if (res.data?.data?.s3Key) {
            payload.fileUrl = res.data.data.s3Key;
            payload.fileSize = res.data.data.fileSize || uploadFile.size;
            if (res.data.data.totalPages && res.data.data.totalPages > (payload.totalPages || 0)) {
              payload.totalPages = res.data.data.totalPages;
            }
          }
        }

        if (editingPdf) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['admin-pdfs'] });
      closeDrawer();
      toast.success(selectedFiles.length > 1 ? `Successfully uploaded ${selectedFiles.length} study notes!` : 'Study note saved successfully!');
    } catch (err: any) {
      toast.dismiss('upload_toast');
      setFormError('Upload failed: ' + (err.message || err.response?.data?.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? pdfs.map((p: any) => p.id) : []);
  const handleSelectRow = (id: string, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  const handleBulkDelete = async () => { if (!confirm(`Delete ${selectedIds.length} PDFs?`)) return; for (const id of selectedIds) await deleteMutation.mutateAsync(id); setSelectedIds([]); };

  const isBusy = createMutation.isPending || updateMutation.isPending || isUploading;

  return (
    <div className="space-y-6 pb-16">
      <AdminTableHeader
        title="PDF Library"
        subtitle="Manage study notes, guides and premium documents"
        search={search} onSearchChange={setSearch} searchPlaceholder="Search by title or slug..."
        onCreate={openCreate} createLabel="Upload PDF"
        limit={limit} onLimitChange={setLimit}
        selectedCount={selectedIds.length} onBulkDelete={handleBulkDelete}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={examFilter} onChange={e => { setExamFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Exams</option>
              {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <select value={accessFilter} onChange={e => { setAccessFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Access</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Draft</option>
            </select>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading PDF library...</div>
        ) : pdfs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">No PDFs Found</h3>
            <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Upload First PDF</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={selectedIds.length === pdfs.length && pdfs.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                  </th>
                  <th className="py-3.5 px-4">Document</th>
                  <th className="py-3.5 px-4">Exam / Subject</th>
                  <th className="py-3.5 px-4 text-center">Pages / Size</th>
                  <th className="py-3.5 px-4 text-center">Access</th>
                  <th className="py-3.5 px-4 text-center">Views</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pdfs.map((pdf: any) => (
                  <tr key={pdf.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4">
                      <input type="checkbox" checked={selectedIds.includes(pdf.id)}
                        onChange={e => handleSelectRow(pdf.id, e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden relative group">
                          {pdf.thumbnailUrl ? (
                            <img 
                              src={getProxyUrl(pdf.thumbnailUrl)} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                            />
                          ) : null}
                          <FileText className={`w-5 h-5 text-blue-400 ${pdf.thumbnailUrl ? 'hidden' : ''}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 line-clamp-1">{pdf.title}</p>
                          <p className="text-xs text-gray-400">{pdf.author} · {pdf.language}</p>
                          {pdf.isFeatured && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">FEATURED</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm font-medium text-gray-800">{pdf.exam?.name || '—'}</p>
                      <p className="text-xs text-gray-500">{pdf.subject?.name || '—'}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <p className="text-sm font-bold text-gray-900">{pdf.totalPages || 0} pages</p>
                      <p className="text-xs text-gray-400">{formatFileSize(pdf.fileSize)}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {!pdf.requiresSubscription ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <Unlock className="w-3 h-3" /> Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          <Lock className="w-3 h-3" /> Premium
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{pdf.viewCount || 0}</span>
                        <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{pdf.downloadCount || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => toggleMutation.mutate(pdf.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${pdf.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {pdf.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {pdf.isActive ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pdf.s3Key && (
                          <a href={`/api/v1/pdfs/${pdf.id}/stream`} target="_blank" rel="noreferrer"
                            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-gray-500 transition-colors" title="Preview PDF">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => openEdit(pdf)} className="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-gray-500 transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => duplicateMutation.mutate(pdf.id)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-gray-500 transition-colors" title="Duplicate"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(pdf)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-gray-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            <h3 className="font-bold text-gray-900 mb-1">Delete "{deleteConfirm.title}"?</h3>
            <p className="text-sm text-gray-500 mb-5">This document will be soft-deleted and hidden from students.</p>
            <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button><button onClick={() => deleteMutation.mutate(deleteConfirm.id)} className="btn-danger flex-1">Delete</button></div>
          </div>
        </div>
      )}

      {/* Slide Drawer */}
      <SlideDrawer
        isOpen={drawerOpen} onClose={closeDrawer}
        title={editingPdf ? `Edit: ${editingPdf.title}` : 'Upload New Study Note'}
        subtitle="Configure file source, access control, and watermark"
        icon={<FileText className="w-5 h-5" />}
        width="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={closeDrawer} disabled={isBusy} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={isBusy} className="btn-primary">
              {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> :
               editingPdf ? 'Save Changes' : 'Upload Study Note'}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Title *</label>
            <input disabled={selectedFiles.length > 1} value={formData.title} onChange={e => { const t = e.target.value; setFormData(p => ({ ...p, title: t, slug: editingPdf ? p.slug : generateSlug(t) })); }} placeholder={selectedFiles.length > 1 ? "Auto-generated from filenames" : "e.g. Quant Formula Sheet"} className="input disabled:opacity-50" />
          </div>
          <div>
            <label className="label">Slug *</label>
            <input disabled={selectedFiles.length > 1} value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} className="input font-mono text-sm disabled:opacity-50" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Parent Exam</label>
            <select value={formData.examId} onChange={e => setFormData(p => ({ ...p, examId: e.target.value, subjectId: '' }))} className="input">
              <option value="">Select Exam...</option>
              {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject {formData.examId && <span className="font-normal text-gray-400">({formSubjects.length})</span>}</label>
            <select value={formData.subjectId} onChange={e => setFormData(p => ({ ...p, subjectId: e.target.value }))} className="input" disabled={!formData.examId}>
              <option value="">{formData.examId ? 'Select Subject...' : '← Select Exam first'}</option>
              {formSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select value={formData.language} onChange={e => setFormData(p => ({ ...p, language: e.target.value }))} className="input">
              <option value="ENGLISH">English</option>
              <option value="HINDI">Hindi</option>
              <option value="BILINGUAL">Bilingual</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Author</label>
          <input value={formData.author} onChange={e => setFormData(p => ({ ...p, author: e.target.value }))} className="input" />
        </div>

        {/* PDF File Upload */}
        <div>
          <label className="label">PDF File(s) *</label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            {selectedFiles.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">{selectedFiles.length > 1 ? `${selectedFiles.length} files selected` : selectedFiles[0].name}</span>
                </div>
                {selectedFiles.length === 1 && <p className="text-xs text-gray-500">{formatFileSize(selectedFiles[0].size)} {formData.totalPages ? `· ${formData.totalPages} pages detected` : ''}</p>}
                <button type="button" onClick={e => { e.stopPropagation(); setSelectedFiles([]); setFormData(p => ({ ...p, fileUrl: '', fileSize: 0 })); }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold underline">Remove files</button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-600">Click to upload PDF(s) <span className="font-normal text-gray-400">(max 100MB)</span></p>
                {formData.fileUrl && selectedFiles.length === 0 && <p className="text-xs font-mono text-gray-500 truncate">{formData.fileUrl}</p>}
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple accept="application/pdf" className="hidden"
              onChange={e => { const f = e.target.files; if (f?.length) handleFileSelect(f); }} />
          </div>

          <p className="text-[10px] text-gray-400 mt-2 font-medium"><Zap className="w-3 h-3 inline text-amber-500 mr-1" />Files are automatically compressed on upload without losing quality.</p>

          {/* URL fallback */}
          {selectedFiles.length === 0 && (
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">Or enter S3 key / external URL</label>
              <input value={formData.fileUrl} onChange={e => setFormData(p => ({ ...p, fileUrl: e.target.value }))}
                placeholder="pdfs/my-notes.pdf or https://..." className="input font-mono text-xs" />
            </div>
          )}
        </div>

        <div>
          <ImageUploadField label="Thumbnail Image" value={formData.thumbnailUrl} onChange={v => setFormData(p => ({ ...p, thumbnailUrl: v }))} hint="Shown as PDF cover image in lists" />
          {selectedFiles.length > 0 && !formData.thumbnailUrl && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 mt-2">
              <input type="checkbox" checked={autoThumbnail} onChange={e => setAutoThumbnail(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4" />
              Auto-generate thumbnail from the first page of PDF
            </label>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Summary of this study note..." className="input resize-none" />
        </div>

        {/* Security Box */}
        <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl space-y-4">
          <p className="text-sm font-bold text-violet-900 flex items-center gap-2"><Lock className="w-4 h-4" />Access Control & Security</p>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
              <input type="checkbox" checked={formData.requiresSubscription} onChange={e => setFormData(p => ({ ...p, requiresSubscription: e.target.checked }))}
                className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4" />
              Premium Subscription Required
            </label>
            {formData.requiresSubscription && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-800">Free Preview Pages:</span>
                <input type="number" value={formData.freePreviewPages} min="0"
                  onChange={e => setFormData(p => ({ ...p, freePreviewPages: +e.target.value }))}
                  className="w-16 px-2 py-1 bg-white border border-violet-200 rounded-xl text-xs font-bold text-center" />
              </div>
            )}
          </div>

          <div>
            <label className="label text-xs">Watermark Text</label>
            <input value={formData.watermarkText} onChange={e => setFormData(p => ({ ...p, watermarkText: e.target.value }))}
              className="input text-xs" placeholder="e.g. OpenEAcademy - Student" />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input type="checkbox" checked={formData.allowDownload} onChange={e => setFormData(p => ({ ...p, allowDownload: e.target.checked }))}
                className="rounded text-indigo-600" />
              Allow Download
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData(p => ({ ...p, isFeatured: e.target.checked }))}
                className="rounded text-amber-500" />
              Featured
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded text-emerald-600" />
              Publish Now
            </label>
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
}
