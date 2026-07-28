import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/api';
import AdminTableHeader from '../components/shared/AdminTableHeader';
import AdminPagination from '../components/shared/AdminPagination';
import SlideDrawer from '../components/shared/SlideDrawer';
import { 
  Trophy, Plus, Edit3, Trash2, CheckCircle2, XCircle, 
  AlertCircle, X, HelpCircle, Check, ArrowLeft, Settings,
  CheckSquare, FileSpreadsheet, Sparkles, Filter, ListPlus, Copy, FolderPlus, Tag, Unlink, Wand
} from 'lucide-react';

export default function QuizzesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<any | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Builder Modal State
  const [builderQuiz, setBuilderQuiz] = useState<any | null>(null);
  const [builderTab, setBuilderTab] = useState<'inline' | 'bank'>('inline');

  // Form states for Settings
  const [settingsForm, setSettingsForm] = useState({
    title: '',
    slug: '',
    description: '',
    examId: '',
    subjectId: '',
    type: 'TOPIC_QUIZ',
    durationMinutes: 30,
    totalMarks: 100,
    passingMarks: 35,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    shuffleQuestions: true,
    shuffleOptions: true,
    maxAttempts: 0,
    requiresSubscription: true,
    isPublished: true,
    isFeatured: false,
    isMultiSubject: false,
    markDistributionType: 'EQUAL',
    subjectConfigs: [] as any[],
  });

  const [formError, setFormError] = useState('');

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiGet<any[]>('/admin/categories'),
  });
  const categories = categoriesData?.data || [];

  // Dropdowns - Exams
  const { data: examsData } = useQuery({
    queryKey: ['admin-exams-dropdown'],
    queryFn: () => apiGet<any>('/exams/admin/all?limit=100'),
  });
  const exams = examsData?.data || [];

  // Dropdowns - Subjects (Deduplicated)
  const { data: subjectsData } = useQuery({
    queryKey: ['admin-subjects-dropdown', examFilter],
    queryFn: () => apiGet<any>(`/subjects/admin/all?limit=100&examId=${examFilter !== 'all' ? examFilter : ''}`),
  });
  const rawSubjects = subjectsData?.data || [];

  // Deduplicate Subjects list by Exam and Name to fix duplicate entries
  const subjects = useMemo(() => {
    const seen = new Set();
    return rawSubjects.filter((s: any) => {
      const key = `${s.examId || ''}_${s.name?.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rawSubjects]);

  // Form Subjects filtered by selected Exam and deduplicated
  const formSubjects = useMemo(() => {
    const filtered = subjects.filter((s: any) => !settingsForm.examId || s.examId === settingsForm.examId);
    const seen = new Set();
    return filtered.filter((s: any) => {
      const key = s.name?.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [subjects, settingsForm.examId]);

  // Fetch Quizzes List
  const { data, isLoading } = useQuery({
    queryKey: ['admin-quizzes', page, limit, search, examFilter, subjectFilter, typeFilter, statusFilter],
    queryFn: () =>
      apiGet<any>(
        `/quizzes/admin/all?page=${page}&limit=${limit}&search=${encodeURIComponent(
          search
        )}&examId=${examFilter}&subjectId=${subjectFilter}&type=${typeFilter}&status=${statusFilter}`
      ),
  });

  const quizzes = data?.data || [];
  const total = data?.meta?.total || 0;

  // Builder Inspection Query
  const { data: builderData, isLoading: isBuilderLoading } = useQuery({
    queryKey: ['quiz-builder', builderQuiz?.id],
    queryFn: () => apiGet<any>(`/quizzes/${builderQuiz.id}/builder`),
    enabled: !!builderQuiz,
  });
  const currentQuizDetails = builderData?.data || null;

  // Question Bank Query for Tab 2
  const [bankSearch, setBankSearch] = useState('');
  const [bankCategoryFilter, setBankCategoryFilter] = useState('all');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const { data: bankData } = useQuery({
    queryKey: ['admin-question-bank-for-quiz', bankSearch, bankCategoryFilter, builderTab],
    queryFn: () => apiGet<any>(`/admin/questions?limit=100&search=${encodeURIComponent(bankSearch)}&categoryId=${bankCategoryFilter !== 'all' ? bankCategoryFilter : ''}`),
    enabled: builderTab === 'bank' && !!builderQuiz,
  });
  const bankQuestions = bankData?.data || [];

  // Inline Question Form
  const [inlineForm, setInlineForm] = useState({
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

  // Mutations for Quizzes
  const createMutation = useMutation({
    mutationFn: (payload: any) => apiPost('/quizzes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      closeSettings();
    },
    onError: (err: any) => setFormError(err?.message || 'Failed to create quiz'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => apiPut(`/quizzes/${editingQuiz.id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      closeSettings();
    },
    onError: (err: any) => setFormError(err?.message || 'Failed to update quiz'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/quizzes/${id}/duplicate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/quizzes/${id}/toggle-status`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteQuestions }: { id: string; deleteQuestions: boolean }) =>
      apiDelete(`/quizzes/${id}?deleteQuestions=${deleteQuestions}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions-bank'] });
      setQuizToDelete(null);
      toast.success('Quiz deleted successfully!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete quiz'),
  });

  // Builder Mutations
  const inlineQuestionMutation = useMutation({
    mutationFn: (payload: any) => apiPost(`/quizzes/${builderQuiz?.id}/questions/inline`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions-bank'] });
      setInlineForm({
        categoryId: categories[0]?.id || '',
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
    },
    onError: (err: any) => alert(err?.message || 'Failed to create inline question'),
  });

  const attachBankMutation = useMutation({
    mutationFn: (ids: string[]) => apiPost(`/quizzes/${builderQuiz?.id}/questions`, { questionIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      setSelectedBankIds([]);
    },
    onError: (err: any) => alert(err?.message || 'Failed to attach selected questions'),
  });

  const pickByCategoryMutation = useMutation({
    mutationFn: (categorySelections: any[]) => apiPost(`/quizzes/${builderQuiz?.id}/questions/pick-by-category`, { categorySelections }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      alert(`Successfully attached ${res?.data?.totalAttached || 0} questions from selected categories!`);
      setCategoryCounts({});
    },
    onError: (err: any) => alert(err?.message || 'Failed to attach questions by category'),
  });

  const generateFromRulesMutation = useMutation({
    mutationFn: (quizId: string) => apiPost(`/quizzes/${quizId}/generate-questions-from-rules`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      toast.success(res?.message || 'Questions generated from rules successfully!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to generate questions from rules'),
  });

  const removeQuestionMutation = useMutation({
    mutationFn: ({ questionId, deleteFromBank }: { questionId: string; deleteFromBank: boolean }) =>
      apiDelete(`/quizzes/${builderQuiz?.id}/questions/${questionId}?deleteFromBank=${deleteFromBank}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions-bank'] });
      toast.success('Question removed!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove question'),
  });

  const clearQuizQuestionsMutation = useMutation({
    mutationFn: ({ quizId, deleteFromBank }: { quizId: string; deleteFromBank: boolean }) =>
      apiDelete(`/quizzes/${quizId}/questions/all?deleteFromBank=${deleteFromBank}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-builder'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions-bank'] });
      setIsClearModalOpen(false);
      toast.success('Questions cleared!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to clear questions'),
  });

  const openCreate = () => {
    setEditingQuiz(null);
    setSettingsForm({
      title: '',
      slug: '',
      description: '',
      examId: examFilter !== 'all' ? examFilter : exams[0]?.id || '',
      subjectId: subjectFilter !== 'all' ? subjectFilter : subjects[0]?.id || '',
      type: 'TOPIC_QUIZ',
      durationMinutes: 30,
      totalMarks: 100,
      passingMarks: 35,
      negativeMarking: false,
      negativeMarkValue: 0.25,
      shuffleQuestions: true,
      shuffleOptions: true,
      maxAttempts: 0,
      requiresSubscription: true,
      isPublished: true,
      isFeatured: false,
      isMultiSubject: false,
      markDistributionType: 'EQUAL',
      subjectConfigs: [] as any[],
    });
    setFormError('');
    setIsSettingsOpen(true);
  };

  const openEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setSettingsForm({
      title: quiz.title || '',
      slug: quiz.slug || '',
      description: quiz.description || '',
      examId: quiz.examId || '',
      subjectId: quiz.subjectId || '',
      type: quiz.type || 'TOPIC_QUIZ',
      durationMinutes: quiz.durationMinutes || 30,
      totalMarks: quiz.totalMarks || 100,
      passingMarks: quiz.passingMarks || 35,
      negativeMarking: quiz.negativeMarking ?? false,
      negativeMarkValue: quiz.negativeMarkValue || 0.25,
      shuffleQuestions: quiz.shuffleQuestions ?? true,
      shuffleOptions: quiz.shuffleOptions ?? true,
      maxAttempts: quiz.maxAttempts || 0,
      requiresSubscription: quiz.requiresSubscription ?? true,
      isPublished: quiz.isActive ?? true,
      isFeatured: quiz.isFeatured ?? false,
      isMultiSubject: quiz.isMultiSubject ?? false,
      markDistributionType: quiz.markDistributionType ?? 'EQUAL',
      subjectConfigs: quiz.subjectConfigs || [],
    });
    setFormError('');
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setEditingQuiz(null);
  };

  const handleTitleChange = (title: string) => {
    setSettingsForm(prev => ({
      ...prev,
      title,
      slug: editingQuiz
        ? prev.slug
        : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleSaveSettings = () => {
    if (!settingsForm.title.trim() || !settingsForm.slug.trim()) {
      setFormError('Title and Slug are required.');
      return;
    }

    if (editingQuiz) {
      updateMutation.mutate(settingsForm);
    } else {
      createMutation.mutate(settingsForm);
    }
  };

  const handlePickCategorySubmit = () => {
    const selections = Object.entries(categoryCounts)
      .map(([categoryId, count]) => ({ categoryId, count: Number(count) }))
      .filter(s => s.count > 0);

    if (selections.length === 0) {
      alert('Please enter at least 1 question count for a category.');
      return;
    }

    pickByCategoryMutation.mutate(selections);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(quizzes.map((q: any) => q.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected quizzes?`)) return;
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync({ id, deleteQuestions: false });
    }
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* If Builder is active, render Quiz/Test Builder Screen */}
      {builderQuiz ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBuilderQuiz(null)}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors"
                title="Back to Quiz Catalog"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                    Test Builder
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">{builderQuiz.title}</h2>
                </div>
                <p className="text-xs text-gray-400 font-mono">/{builderQuiz.slug} • {builderQuiz.durationMinutes} Mins • {builderQuiz.totalMarks} Marks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                Current Questions: {currentQuizDetails?.quizQuestions?.length || 0}
              </span>
              {(currentQuizDetails?.quizQuestions?.length || 0) > 0 && (
                <button
                  onClick={() => setIsClearModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Questions
                </button>
              )}
              <button
                onClick={() => openEdit(builderQuiz)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-4 h-4" /> Edit Quiz Rules
              </button>
            </div>
          </div>

          {/* EXACTLY 2 Creation Method Tabs as requested */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <button
              onClick={() => setBuilderTab('inline')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                builderTab === 'inline' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-4 h-4" /> 1. Inline Create
            </button>
            <button
              onClick={() => setBuilderTab('bank')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                builderTab === 'bank' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckSquare className="w-4 h-4" /> 2. Pick from Question Bank
            </button>
          </div>

          {/* Tab 1: Inline Create Question */}
          {builderTab === 'inline' && (
            <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-600" /> Inline Question Authoring
              </h3>
              <div className="space-y-3">
                {/* Category Option for Inline */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category (Optional)</label>
                  <select
                    value={inlineForm.categoryId}
                    onChange={e => setInlineForm({ ...inlineForm, categoryId: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Question Text *</label>
                  <textarea
                    rows={2}
                    value={inlineForm.questionText}
                    onChange={e => setInlineForm({ ...inlineForm, questionText: e.target.value })}
                    placeholder="Enter question prompt..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Difficulty</label>
                    <select
                      value={inlineForm.difficulty}
                      onChange={e => setInlineForm({ ...inlineForm, difficulty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Marks (+)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={inlineForm.marks}
                      onChange={e => setInlineForm({ ...inlineForm, marks: Number(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Penalty (-)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={inlineForm.negativeMarks}
                      onChange={e => setInlineForm({ ...inlineForm, negativeMarks: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">4 Options (Check radio for correct answer) *</label>
                  {inlineForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="inlineCorrectOption"
                        checked={opt.isCorrect}
                        onChange={() => {
                          const updated = inlineForm.options.map((o, i) => ({ ...o, isCorrect: i === idx }));
                          setInlineForm({ ...inlineForm, options: updated });
                        }}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <input
                        type="text"
                        value={opt.optionText}
                        onChange={e => {
                          const updated = [...inlineForm.options];
                          updated[idx].optionText = e.target.value;
                          setInlineForm({ ...inlineForm, options: updated });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Detailed Explanation (Optional)</label>
                  <input
                    type="text"
                    value={inlineForm.explanation}
                    onChange={e => setInlineForm({ ...inlineForm, explanation: e.target.value })}
                    placeholder="Why this answer is correct..."
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (!inlineForm.questionText.trim()) return alert('Question prompt is required');
                      if (!inlineForm.options.some(o => o.optionText.trim())) return alert('Please enter option texts');
                      inlineQuestionMutation.mutate(inlineForm);
                    }}
                    disabled={inlineQuestionMutation.isPending}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {inlineQuestionMutation.isPending ? 'Adding to Test...' : '+ Save & Attach Question'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Pick from Question Bank (With Category Filtering & Custom Question Count per Category) */}
          {builderTab === 'bank' && (
            <div className="space-y-6">
              {/* Section A: Pick by Category Count Selection */}
              <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-blue-50/90 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-indigo-600" /> Auto-Select Questions by Category Counts
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">Specify how many questions to pull from each category</span>
                </div>

                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400">No categories created yet. Create categories in Question Bank to auto-pick by category.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map((cat: any) => (
                      <div key={cat.id} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-xs">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{cat.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{cat._count?.questions || 0} questions available</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={cat._count?.questions || 100}
                          placeholder="Count"
                          value={categoryCounts[cat.id] || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setCategoryCounts(prev => ({ ...prev, [cat.id]: val }));
                          }}
                          className="w-16 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handlePickCategorySubmit}
                    disabled={pickByCategoryMutation.isPending}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" /> {pickByCategoryMutation.isPending ? 'Attaching Questions...' : 'Attach Questions from Selected Categories'}
                  </button>
                </div>
              </div>

              {/* Section B: Individual Question Multi-Select Repository */}
              <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary-600" /> Manual Multi-Select from Question Bank
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Category Filter */}
                    <select
                      value={bankCategoryFilter}
                      onChange={e => setBankCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">All Categories ({categories.length})</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={bankSearch}
                      onChange={e => setBankSearch(e.target.value)}
                      placeholder="Search bank by prompt..."
                      className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs w-48 focus:outline-none"
                    />

                    <button
                      onClick={() => {
                        if (selectedBankIds.length === 0) return alert('Select at least 1 checkbox');
                        attachBankMutation.mutate(selectedBankIds);
                      }}
                      disabled={selectedBankIds.length === 0 || attachBankMutation.isPending}
                      className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 shadow-sm"
                    >
                      {attachBankMutation.isPending ? 'Attaching...' : `+ Attach Selected (${selectedBankIds.length})`}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {bankQuestions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">No matching questions found in bank for selected category/filter.</div>
                  ) : (
                    bankQuestions.map((q: any) => (
                      <label key={q.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedBankIds.includes(q.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedBankIds(prev => [...prev, q.id]);
                            else setSelectedBankIds(prev => prev.filter(i => i !== q.id));
                          }}
                          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {q.category && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {q.category.name}
                              </span>
                            )}
                            <p className="font-bold text-gray-800 line-clamp-1">{q.questionText}</p>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Difficulty: <span className="font-semibold text-gray-600">{q.difficulty}</span> • Marks: +{q.marks}/-{q.negativeMarks}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attached Questions List */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-extrabold text-gray-800 flex items-center justify-between">
              <span>Attached Questions in Quiz Order ({currentQuizDetails?.quizQuestions?.length || 0})</span>
              <span className="text-xs text-gray-400 font-normal">Questions automatically shuffle during student exam attempts if enabled</span>
            </h3>

            {isBuilderLoading ? (
              <div className="p-8 text-center text-xs text-gray-400 font-semibold">Loading attached questions...</div>
            ) : !currentQuizDetails?.quizQuestions || currentQuizDetails?.quizQuestions.length === 0 ? (
              <div className="p-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                <p className="text-sm font-bold text-gray-700">No questions attached to this quiz yet.</p>
                <p className="text-xs text-gray-400">Use Inline Create or Pick from Question Bank to add test items.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuizDetails.quizQuestions.map((qq: any, index: number) => {
                  const q = qq.question;
                  if (!q) return null;
                  return (
                    <div key={qq.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            {q.category && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {q.category.name}
                              </span>
                            )}
                            <p className="text-sm font-bold text-gray-900">{q.questionText}</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {q.options?.map((opt: any, optIdx: number) => (
                              <div
                                key={opt.id || optIdx}
                                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${
                                  opt.isCorrect
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                                    : 'bg-white border-gray-200 text-gray-600'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}. {opt.optionText}</span>
                                {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1 font-semibold">
                            <span className="bg-gray-200/80 text-gray-700 px-2 py-0.5 rounded">{q.difficulty}</span>
                            <span>Marks: +{q.marks} / -{q.negativeMarks}</span>
                            {q.explanation && <span className="text-indigo-600 italic truncate">Explanation: {q.explanation}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeQuestionMutation.mutate({ questionId: q.id, deleteFromBank: false })}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Detach from Quiz (Keep in Bank)"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Permanently delete this question from the Question Bank?')) {
                              removeQuestionMutation.mutate({ questionId: q.id, deleteFromBank: true });
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Question Permanently (From Bank)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <AdminTableHeader
            title="Quiz & Test Series Catalog"
            subtitle="Author topic quizzes, full-length mocks, and daily test challenges with automated scoring"
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search quizzes by title or slug..."
            onCreate={openCreate}
            createLabel="Add Quiz / Mock Test"
            limit={limit}
            onLimitChange={setLimit}
            selectedCount={selectedIds.length}
            onBulkDelete={handleBulkDelete}
            filters={
              <div className="flex items-center gap-2 flex-wrap">
                {/* Deduplicated Subjects Filter */}
                <select
                  value={subjectFilter}
                  onChange={e => { setSubjectFilter(e.target.value); setPage(1); }}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="all">All Quiz Types</option>
                  <option value="TOPIC_QUIZ">Topic Quiz</option>
                  <option value="SUBJECT_QUIZ">Subject Quiz</option>
                  <option value="FULL_EXAM_QUIZ">Full Exam Mocks</option>
                  <option value="MOCK_TEST">Mock Test</option>
                  <option value="DAILY_QUIZ">Daily Quiz</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            }
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500 font-semibold">Loading Quiz Catalog...</div>
            ) : quizzes.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="text-lg font-bold text-gray-800">No Quizzes Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">Create mock tests and topic quizzes to help students practice.</p>
                <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl shadow-sm">
                  + Create First Quiz
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === quizzes.length && quizzes.length > 0}
                          onChange={e => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="py-3.5 px-4">Quiz Title & Slug</th>
                      <th className="py-3.5 px-4">Parent Subject</th>
                      <th className="py-3.5 px-4 text-center">Type & Duration</th>
                      <th className="py-3.5 px-4 text-center">Marks & Questions</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {quizzes.map((quiz: any) => (
                      <tr key={quiz.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(quiz.id)}
                            onChange={e => handleSelectRow(quiz.id, e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold flex-shrink-0 border border-purple-100 shadow-xs">
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 max-w-xs">
                              <p className="font-bold text-gray-900 truncate" title={quiz.title}>{quiz.title}</p>
                              <p className="text-xs text-gray-400 font-mono truncate">/{quiz.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {quiz.exam && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: quiz.exam.color || '#2563eb' }} />
                                {quiz.exam.name}
                              </span>
                            )}
                            {quiz.subject && <p className="text-xs font-semibold text-indigo-600">{quiz.subject.name}</p>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 mb-1">
                            {quiz.type?.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-gray-500 font-medium">{quiz.durationMinutes} mins</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <p className="text-xs font-bold text-gray-900">{quiz.totalMarks} Marks</p>
                          <p className="text-xs text-indigo-600 font-semibold">{quiz._count?.quizQuestions || 0} Questions</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => toggleStatusMutation.mutate(quiz.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              quiz.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {quiz.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {quiz.isActive ? 'Active' : 'Draft'}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {quiz.isMultiSubject && (
                              <button
                                onClick={() => {
                                  if (confirm('Generate questions for all subjects based on the saved rules? This will append to existing questions.')) {
                                    generateFromRulesMutation.mutate(quiz.id);
                                  }
                                }}
                                disabled={generateFromRulesMutation.isPending}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                title="Generate Multi-Subject Questions"
                              >
                                <Wand className="w-3.5 h-3.5" /> Auto-Gen
                              </button>
                            )}
                            <button
                              onClick={() => setBuilderQuiz(quiz)}
                              className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Manage Questions & Test Structure"
                            >
                              <Plus className="w-3.5 h-3.5" /> Questions
                            </button>
                            <button
                              onClick={() => openEdit(quiz)}
                              className="p-2 bg-gray-100 hover:bg-primary-50 hover:text-primary-600 rounded-xl text-gray-600 transition-colors"
                              title="Edit Quiz Settings"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateMutation.mutate(quiz.id)}
                              className="p-2 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-gray-600 transition-colors"
                              title="Duplicate Quiz"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setQuizToDelete(quiz)}
                              className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-gray-600 transition-colors"
                              title="Delete Quiz Options"
                            >
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
        </>
      )}

      {/* Settings Drawer */}
      <SlideDrawer
        isOpen={isSettingsOpen} onClose={closeSettings}
        title={editingQuiz ? `Edit: ${editingQuiz.title}` : 'Create New Quiz / Mock Test'}
        subtitle="Configure quiz metadata, scoring, timing, and security"
        icon={<Trophy className="w-5 h-5" />}
        width="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={closeSettings} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveSettings} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingQuiz ? 'Update Settings' : 'Create Quiz'}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" /><span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Quiz Title *</label>
            <input type="text" value={settingsForm.title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. Quant Full Mock Test 01" className="input" />
          </div>
          <div>
            <label className="label">Slug *</label>
            <input type="text" value={settingsForm.slug} onChange={e => setSettingsForm({ ...settingsForm, slug: e.target.value })} placeholder="quant-mock-test-01" className="input font-mono text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Parent Exam</label>
            <select value={settingsForm.examId} onChange={e => setSettingsForm({ ...settingsForm, examId: e.target.value, subjectId: '' })} className="input">
              <option value="">Select Exam...</option>
              {exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div className="col-span-1 sm:col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Subject Configuration</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Single</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settingsForm.isMultiSubject} onChange={e => setSettingsForm({ ...settingsForm, isMultiSubject: e.target.checked, subjectId: e.target.checked ? '' : settingsForm.subjectId })} className="sr-only peer" />
                  <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
                <span className="text-xs font-bold text-primary-600">Multi-Subject (Mock)</span>
              </div>
            </div>
            {!settingsForm.isMultiSubject ? (
              <select value={settingsForm.subjectId} onChange={e => setSettingsForm({ ...settingsForm, subjectId: e.target.value })} className="input" disabled={!settingsForm.examId}>
                <option value="">{settingsForm.examId ? 'Select Primary Subject...' : '← Select an Exam first'}</option>
                {formSubjects.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            ) : (
              <div className="space-y-3">
                {settingsForm.subjectConfigs.map((cfg: any, index: number) => (
                  <div key={index} className="p-3 bg-white border border-gray-200 rounded-xl relative">
                    <button type="button" onClick={() => { const c = [...settingsForm.subjectConfigs]; c.splice(index, 1); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="absolute top-2 right-2 text-gray-400 hover:text-rose-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 pr-8 mb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject</label>
                        <select value={cfg.subjectId} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].subjectId = e.target.value; setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold focus:outline-none">
                          <option value="">Select...</option>
                          {formSubjects.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Selection Mode</label>
                        <select value={cfg.selectionMode || 'TOTAL_RANDOM'} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].selectionMode = e.target.value; setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold focus:outline-none text-primary-700">
                          <option value="TOTAL_RANDOM">Total Random</option>
                          <option value="SELECTIVE">Exact per Category</option>
                        </select>
                      </div>
                    </div>
                    {(!cfg.selectionMode || cfg.selectionMode === 'TOTAL_RANDOM') ? (
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Questions</label>
                          <input type="number" value={cfg.questionCount} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].questionCount = Number(e.target.value); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categories (optional)</label>
                          <select multiple value={cfg.categoryIds || []} onChange={e => { const opts = Array.from(e.target.selectedOptions, o => o.value); const c = [...settingsForm.subjectConfigs]; c[index].categoryIds = opts; setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold h-16">
                            {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 bg-gray-50 p-2 rounded border border-gray-200">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Category Distribution</label>
                        {(cfg.categoryDistribution || []).map((dist: any, dIndex: number) => (
                          <div key={dIndex} className="flex items-center gap-2 mb-2">
                            <select value={dist.categoryId} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].categoryDistribution[dIndex].categoryId = e.target.value; setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                              <option value="">Select...</option>
                              {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                            <input type="number" placeholder="Count" value={dist.count || ''} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].categoryDistribution[dIndex].count = Number(e.target.value); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-xs" />
                            <button type="button" onClick={() => { const c = [...settingsForm.subjectConfigs]; c[index].categoryDistribution.splice(dIndex, 1); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="p-1 text-gray-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => { const c = [...settingsForm.subjectConfigs]; if (!c[index].categoryDistribution) c[index].categoryDistribution = []; c[index].categoryDistribution.push({ categoryId: '', count: 5 }); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="text-[10px] font-bold text-primary-600 flex items-center gap-1 mt-1"><Plus className="w-3 h-3" /> Add Category</button>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={cfg.isRandom ?? true} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].isRandom = e.target.checked; setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="rounded border-gray-300 text-primary-600" />
                        <span className="text-[10px] font-bold text-gray-700">Randomize Select</span>
                      </label>
                      {settingsForm.markDistributionType === 'MANUAL' && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Marks per Q:</label>
                          <input type="number" value={cfg.marksPerQuestion || ''} onChange={e => { const c = [...settingsForm.subjectConfigs]; c[index].marksPerQuestion = Number(e.target.value); setSettingsForm({ ...settingsForm, subjectConfigs: c }); }} className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setSettingsForm({ ...settingsForm, subjectConfigs: [...settingsForm.subjectConfigs, { subjectId: '', questionCount: 10, isRandom: true, categoryIds: [], marksPerQuestion: 1 }] })} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Subject Rules
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="label">Quiz Type</label>
            <select value={settingsForm.type} onChange={e => setSettingsForm({ ...settingsForm, type: e.target.value })} className="input">
              <option value="TOPIC_QUIZ">Topic Quiz</option>
              <option value="SUBJECT_QUIZ">Subject Quiz</option>
              <option value="FULL_EXAM_QUIZ">Full Exam Quiz</option>
              <option value="MOCK_TEST">Mock Test</option>
              <option value="DAILY_QUIZ">Daily Quiz</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><label className="label">Duration (mins)</label><input type="number" value={settingsForm.durationMinutes} onChange={e => setSettingsForm({ ...settingsForm, durationMinutes: Number(e.target.value) || 30 })} className="input" /></div>
          <div><label className="label">Total Marks</label><input type="number" value={settingsForm.totalMarks} onChange={e => setSettingsForm({ ...settingsForm, totalMarks: Number(e.target.value) || 100 })} className="input" /></div>
          <div><label className="label">Passing Marks</label><input type="number" value={settingsForm.passingMarks} onChange={e => setSettingsForm({ ...settingsForm, passingMarks: Number(e.target.value) || 35 })} className="input" /></div>
          <div>
            <label className="label">Marks Distribution</label>
            <select value={settingsForm.markDistributionType} onChange={e => setSettingsForm({ ...settingsForm, markDistributionType: e.target.value as 'EQUAL' | 'MANUAL' })} className="input">
              <option value="EQUAL">Equal per Subject</option>
              <option value="MANUAL">Manual per Subject</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Access Control</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setSettingsForm({ ...settingsForm, requiresSubscription: false })} className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${!settingsForm.requiresSubscription ? 'bg-emerald-50 border-emerald-300 font-bold' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${!settingsForm.requiresSubscription ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>FREE</div>
              <div><p className="text-xs font-bold">Free Access</p><p className="text-[10px] opacity-75">Open to all students</p></div>
            </button>
            <button type="button" onClick={() => setSettingsForm({ ...settingsForm, requiresSubscription: true })} className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${settingsForm.requiresSubscription ? 'bg-purple-50 border-purple-300 font-bold' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${settingsForm.requiresSubscription ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>PRO</div>
              <div><p className="text-xs font-bold">Premium Lock</p><p className="text-[10px] opacity-75">Requires active subscription</p></div>
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 uppercase">Negative Marking</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settingsForm.negativeMarking} onChange={e => setSettingsForm({ ...settingsForm, negativeMarking: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-2 text-xs font-bold text-gray-700">{settingsForm.negativeMarking ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          {settingsForm.negativeMarking && (
            <div>
              <label className="label text-xs">Penalty per Wrong Answer</label>
              <input type="number" step="0.05" value={settingsForm.negativeMarkValue} onChange={e => setSettingsForm({ ...settingsForm, negativeMarkValue: Number(e.target.value) || 0.25 })} className="input" placeholder="0.25" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="label">Max Attempts</label><input type="number" value={settingsForm.maxAttempts} onChange={e => setSettingsForm({ ...settingsForm, maxAttempts: Number(e.target.value) || 0 })} className="input" placeholder="0 = unlimited" /></div>
          <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700"><input type="checkbox" checked={settingsForm.shuffleQuestions} onChange={e => setSettingsForm({ ...settingsForm, shuffleQuestions: e.target.checked })} className="rounded text-primary-600" />Shuffle Questions</label></div>
          <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700"><input type="checkbox" checked={settingsForm.shuffleOptions} onChange={e => setSettingsForm({ ...settingsForm, shuffleOptions: e.target.checked })} className="rounded text-primary-600" />Shuffle Options</label></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700"><input type="checkbox" checked={settingsForm.isPublished} onChange={e => setSettingsForm({ ...settingsForm, isPublished: e.target.checked })} className="rounded text-emerald-600" />Publish Immediately</label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-purple-800"><input type="checkbox" checked={settingsForm.isFeatured} onChange={e => setSettingsForm({ ...settingsForm, isFeatured: e.target.checked })} className="rounded text-purple-600" /><Sparkles className="w-3.5 h-3.5 text-purple-600" />Feature on Homepage</label>
        </div>

        <div>
          <label className="label">Guidelines / Description</label>
          <textarea rows={2} value={settingsForm.description} onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} placeholder="Syllabus covered, attempt rules..." className="input resize-none" />
        </div>
      </SlideDrawer>

      {/* Delete Quiz Modal */}
      {quizToDelete && createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Delete Quiz Options</h3>
                <p className="text-xs text-gray-500 truncate" title={quizToDelete.title}>{quizToDelete.title}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Choose how to delete this test and its questions:</p>
            <div className="space-y-3">
              <button onClick={() => deleteMutation.mutate({ id: quizToDelete.id, deleteQuestions: false })} disabled={deleteMutation.isPending} className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-left transition-colors">
                <p className="text-xs font-bold text-gray-900">1. Delete Quiz Structure Only</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Keeps attached questions in your Question Bank for re-use.</p>
              </button>
              <button onClick={() => deleteMutation.mutate({ id: quizToDelete.id, deleteQuestions: true })} disabled={deleteMutation.isPending} className="w-full p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-left transition-colors">
                <p className="text-xs font-bold text-rose-900">2. Delete Quiz & All Attached Questions</p>
                <p className="text-[11px] text-rose-700 mt-0.5">Permanently deletes quiz AND purges all questions from the bank.</p>
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setQuizToDelete(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Clear Questions Modal */}
      {isClearModalOpen && builderQuiz && createPortal((
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Clear Test Questions</h3>
                <p className="text-xs text-gray-500 truncate" title={builderQuiz.title}>{builderQuiz.title}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium">Choose how to remove all questions from this test:</p>
            <div className="space-y-3">
              <button onClick={() => clearQuizQuestionsMutation.mutate({ quizId: builderQuiz.id, deleteFromBank: false })} disabled={clearQuizQuestionsMutation.isPending} className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-left">
                <p className="text-xs font-bold text-gray-900">1. Detach All Questions from Test</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Unlinks from test but keeps them safe in Question Bank.</p>
              </button>
              <button onClick={() => clearQuizQuestionsMutation.mutate({ quizId: builderQuiz.id, deleteFromBank: true })} disabled={clearQuizQuestionsMutation.isPending} className="w-full p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-left">
                <p className="text-xs font-bold text-rose-900">2. Delete All from Question Bank</p>
                <p className="text-[11px] text-rose-700 mt-0.5">Permanently deletes from both test AND global Question Bank.</p>
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsClearModalOpen(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
