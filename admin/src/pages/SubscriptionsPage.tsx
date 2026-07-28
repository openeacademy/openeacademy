import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import {
  Plus, CreditCard, Clock, Tag, X, Loader2, Edit2, Check,
  Trash2, Star, Shield, Users, BookOpen, Download, BarChart2,
  MessageSquare, Video, UserCheck, Percent, Zap, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Feature Definitions ──────────────────────────────────────────────────────

const ALL_FEATURES: { key: string; label: string; description: string; icon: React.ReactNode; group: string }[] = [
  { key: 'access_all_pdfs',       label: 'Unlimited PDF Access',     description: 'Access all PDF study notes across all exams',          icon: <BookOpen className="w-4 h-4" />,    group: 'Content' },
  { key: 'download_pdfs',         label: 'PDF Downloads (Offline)',  description: 'Download PDFs for offline study',                      icon: <Download className="w-4 h-4" />,    group: 'Content' },
  { key: 'access_all_quizzes',    label: 'Unlimited Quizzes',        description: 'Attempt all quizzes without limits',                   icon: <Zap className="w-4 h-4" />,         group: 'Content' },
  { key: 'mock_tests',            label: 'Mock Tests & Timed Tests', description: 'Full-length timed mock tests with auto-grading',       icon: <Clock className="w-4 h-4" />,       group: 'Content' },
  { key: 'question_bank',         label: 'Full Question Bank',       description: 'Access the complete question bank for practice',       icon: <Shield className="w-4 h-4" />,      group: 'Content' },
  { key: 'access_all_exams',      label: 'All Exam Packs',           description: 'Content for all available exam categories',           icon: <Award className="w-4 h-4" />,       group: 'Content' },
  { key: 'detailed_solutions',    label: 'Detailed Solutions',       description: 'Step-by-step answer explanations for all questions',   icon: <Check className="w-4 h-4" />,       group: 'Learning' },
  { key: 'video_explanations',    label: 'Video Explanations',       description: 'Video walkthroughs for difficult topics',              icon: <Video className="w-4 h-4" />,       group: 'Learning' },
  { key: 'mentorship_session',    label: '1-on-1 Mentorship',        description: 'Personal mentorship session with an expert',          icon: <UserCheck className="w-4 h-4" />,   group: 'Learning' },
  { key: 'analytics_dashboard',   label: 'Personal Analytics',       description: 'Detailed performance analytics and progress tracking', icon: <BarChart2 className="w-4 h-4" />,   group: 'Insights' },
  { key: 'all_india_rank',        label: 'All India Rank Engine',    description: 'Compare your rank across all registered students',    icon: <Users className="w-4 h-4" />,       group: 'Insights' },
  { key: 'priority_support',      label: 'Priority Support',         description: '24/7 priority chat and email support',                icon: <MessageSquare className="w-4 h-4" />, group: 'Support' },
  { key: 'coupon_eligible',       label: 'Coupon Code Eligible',     description: 'Can apply discount coupons on purchase',              icon: <Percent className="w-4 h-4" />,     group: 'Billing' },
  { key: 'early_access',         label: 'Early Access',             description: 'First access to new content and features',            icon: <Star className="w-4 h-4" />,        group: 'Billing' },
];

const FEATURE_GROUPS = ['Content', 'Learning', 'Insights', 'Support', 'Billing'];

// ─── Constants ────────────────────────────────────────────────────────────────

const durationLabel: Record<string, string> = {
  ONE_MONTH: '1 Month', THREE_MONTHS: '3 Months', SIX_MONTHS: '6 Months',
  TWELVE_MONTHS: '1 Year', LIFETIME: 'Lifetime',
};
const durationOptions = ['ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_MONTHS', 'LIFETIME'];
const typeOptions = ['BASIC', 'EXAM_PACK', 'PREMIUM'];
const durationDaysMap: Record<string, number> = {
  ONE_MONTH: 30, THREE_MONTHS: 90, SIX_MONTHS: 180, TWELVE_MONTHS: 365, LIFETIME: 36500,
};

interface PlanForm {
  name: string; type: string; duration: string; durationDays: number;
  originalPrice: number; discountedPrice: number; gstPercent: number;
  features: string[]; isFeatured: boolean; isActive: boolean; sortOrder: number;
}

const defaultForm: PlanForm = {
  name: '', type: 'PREMIUM', duration: 'ONE_MONTH', durationDays: 30,
  originalPrice: 499, discountedPrice: 299, gstPercent: 18,
  features: ['access_all_pdfs', 'access_all_quizzes', 'analytics_dashboard'],
  isFeatured: false, isActive: true, sortOrder: 0,
};

// ─── Manual Assign Modal ──────────────────────────────────────────────────────

function ManualAssignModal({ plans, onClose }: { plans: any[]; onClose: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: (data: any) => apiPost<any>('/subscriptions/manual-assign', data),
    onSuccess: () => {
      toast.success('Subscription assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to assign'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !planId || !startDate || !endDate) {
      toast.error('All fields are required');
      return;
    }
    assignMutation.mutate({ identifier, planId, startDate, endDate, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Manual Subscription Assignment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">User (Email / Mobile / ID)</label>
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} className="input" placeholder="user@email.com or 9999999999" required />
          </div>
          <div>
            <label className="label">Select Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="input" required>
              <option value="">— Choose Plan —</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({durationLabel[p.duration]})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" required />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Reason for manual assignment..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={assignMutation.isPending} className="btn-primary flex-1">
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Feature Checkbox Grid ─────────────────────────────────────────────────────

function FeatureSelector({ selected, onChange }: { selected: string[]; onChange: (keys: string[]) => void }) {
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };
  const toggleGroup = (group: string) => {
    const groupKeys = ALL_FEATURES.filter(f => f.group === group).map(f => f.key);
    const allSelected = groupKeys.every(k => selected.includes(k));
    if (allSelected) {
      onChange(selected.filter(k => !groupKeys.includes(k)));
    } else {
      const toAdd = groupKeys.filter(k => !selected.includes(k));
      onChange([...selected, ...toAdd]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Plan Features</label>
        <span className="text-xs text-gray-400">{selected.length}/{ALL_FEATURES.length} selected</span>
      </div>
      {FEATURE_GROUPS.map(group => {
        const groupFeatures = ALL_FEATURES.filter(f => f.group === group);
        const allGroupSelected = groupFeatures.every(f => selected.includes(f.key));
        const someGroupSelected = groupFeatures.some(f => selected.includes(f.key));
        return (
          <div key={group} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">{group}</span>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                allGroupSelected ? 'bg-primary-600 border-primary-600' :
                someGroupSelected ? 'bg-primary-100 border-primary-400' : 'border-gray-300'
              }`}>
                {allGroupSelected && <Check className="w-3 h-3 text-white" />}
                {!allGroupSelected && someGroupSelected && <div className="w-2 h-0.5 bg-primary-600 rounded" />}
              </div>
            </button>
            <div className="divide-y divide-gray-50">
              {groupFeatures.map(feat => (
                <label key={feat.key} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="mt-0.5 flex-shrink-0">
                    <div
                      onClick={() => toggle(feat.key)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected.includes(feat.key) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 hover:border-primary-400'
                      }`}
                    >
                      {selected.includes(feat.key) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => toggle(feat.key)}>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{feat.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{feat.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{feat.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [modal, setModal] = useState<{ open: boolean; plan?: any }>({ open: false });
  const [form, setForm] = useState<PlanForm>(defaultForm);
  const [showManualAssign, setShowManualAssign] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiGet<any[]>('/admin/plans'),
  });

  const plans = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: PlanForm) => apiPost<any>('/admin/plans', data),
    onSuccess: () => { toast.success('Plan created!'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); closeModal(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanForm> }) => apiPut<any>(`/admin/plans/${id}`, data),
    onSuccess: () => { toast.success('Plan updated!'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); closeModal(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/plans/${id}`),
    onSuccess: () => { toast.success('Plan deactivated'); queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); setDeleteConfirm(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to deactivate'),
  });

  const openCreate = () => { setForm(defaultForm); setModal({ open: true }); };
  const openEdit = (plan: any) => {
    setForm({
      name: plan.name, type: plan.type, duration: plan.duration, durationDays: plan.durationDays,
      originalPrice: plan.originalPrice, discountedPrice: plan.discountedPrice,
      gstPercent: plan.gstPercent, features: plan.features || [],
      isFeatured: plan.isFeatured, isActive: plan.isActive, sortOrder: plan.sortOrder || 0,
    });
    setModal({ open: true, plan });
  };
  const closeModal = () => setModal({ open: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.plan) updateMutation.mutate({ id: modal.plan.id, data: form });
    else createMutation.mutate(form);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleDurationChange = (duration: string) => {
    setForm(f => ({ ...f, duration, durationDays: durationDaysMap[duration] || 30 }));
  };

  const typeBadgeColor: Record<string, string> = {
    BASIC: 'bg-gray-100 text-gray-700',
    EXAM_PACK: 'bg-indigo-100 text-indigo-700',
    PREMIUM: 'badge-primary',
  };

  return (
    <div className="space-y-6">

      {/* Plan Create/Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{modal.plan ? 'Edit Plan' : 'Create Subscription Plan'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Plan Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Monthly Pro Pass..." required />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                      {typeOptions.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>

                {/* Duration & Pricing */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Duration</label>
                    <select value={form.duration} onChange={e => handleDurationChange(e.target.value)} className="input">
                      {durationOptions.map(d => <option key={d} value={d}>{durationLabel[d]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Duration (Days)</label>
                    <input type="number" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: +e.target.value }))} className="input" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Original Price (₹)</label>
                    <input type="number" min="0" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: +e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Discounted Price (₹)</label>
                    <input type="number" min="0" value={form.discountedPrice} onChange={e => setForm(f => ({ ...f, discountedPrice: +e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">GST %</label>
                    <input type="number" min="0" max="100" value={form.gstPercent} onChange={e => setForm(f => ({ ...f, gstPercent: +e.target.value }))} className="input" />
                  </div>
                </div>

                {/* Sort Order */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Sort Order</label>
                    <input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: +e.target.value }))} className="input" />
                  </div>
                  <div className="flex items-end gap-6 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
                      <span className="text-sm text-gray-600">Featured (Most Popular)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
                      <span className="text-sm text-gray-600">Active</span>
                    </label>
                  </div>
                </div>

                {/* Feature Selector */}
                <FeatureSelector
                  selected={form.features}
                  onChange={keys => setForm(f => ({ ...f, features: keys }))}
                />
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : modal.plan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Assign Modal */}
      {showManualAssign && (
        <ManualAssignModal plans={plans} onClose={() => setShowManualAssign(false)} />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Deactivate Plan?</h3>
            <p className="text-sm text-gray-500 mb-5">This plan will be hidden from new subscribers. Existing subscribers are unaffected.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500">Manage pricing plans, features, and access control</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowManualAssign(true)} className="btn-secondary">
            <Users className="w-4 h-4" /> Manual Assign
          </button>
          <button onClick={openCreate} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton h-80 rounded-2xl" />)
        ) : plans.length === 0 ? (
          <div className="col-span-full card py-16 text-center text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No plans configured. Create your first subscription plan!</p>
          </div>
        ) : (
          plans.map((plan: any) => {
            const planFeatureKeys: string[] = plan.features || [];
            const featureDetails = planFeatureKeys
              .map(k => ALL_FEATURES.find(f => f.key === k))
              .filter(Boolean) as typeof ALL_FEATURES;
            const discount = plan.originalPrice > plan.discountedPrice
              ? Math.round((1 - plan.discountedPrice / plan.originalPrice) * 100)
              : 0;

            return (
              <div key={plan.id} className={`card p-6 border-2 transition-all flex flex-col ${plan.isFeatured ? 'border-primary-500 shadow-lg shadow-primary-100' : 'border-transparent'} ${!plan.isActive ? 'opacity-60' : ''}`}>
                {/* Plan Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      {plan.isFeatured && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          <Star className="w-2.5 h-2.5" /> FEATURED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-xs ${typeBadgeColor[plan.type] || 'badge-primary'}`}>{plan.type?.replace('_', ' ')}</span>
                      {!plan.isActive && <span className="badge badge-danger text-xs">Inactive</span>}
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900">₹{plan.discountedPrice}</span>
                    {plan.originalPrice > plan.discountedPrice && (
                      <span className="text-sm text-gray-400 line-through">₹{plan.originalPrice}</span>
                    )}
                    {discount > 0 && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{discount}% off</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {durationLabel[plan.duration]}</span>
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {plan.gstPercent}% GST</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {featureDetails.length} features included
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {featureDetails.slice(0, 6).map(f => (
                      <span key={f!.key} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg font-medium">
                        <span className="text-primary-500">{f!.icon}</span>
                        {f!.label}
                      </span>
                    ))}
                    {featureDetails.length > 6 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">+{featureDetails.length - 6} more</span>
                    )}
                  </div>
                </div>

                {/* Created */}
                {plan.createdAt && (
                  <p className="text-xs text-gray-400 mb-3">Created {format(new Date(plan.createdAt), 'dd MMM yyyy')}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => openEdit(plan)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-sm">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(plan.id)}
                    className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-gray-200"
                    title="Deactivate plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
