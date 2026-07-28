import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import {
  Plus, Tag, X, Loader2, Edit2, Percent, DollarSign, Calendar,
  Copy, Check, ToggleLeft, ToggleRight, Trash2, Search, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CouponForm {
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  expiresAt: string | null;
  isActive: boolean;
  description: string;
}

const defaultForm: CouponForm = {
  code: '', type: 'PERCENTAGE', value: 10,
  minPurchase: 0, maxDiscount: null, usageLimit: null,
  expiresAt: null, isActive: true, description: '',
};

function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function CouponsPage() {
  const [modal, setModal] = useState<{ open: boolean; coupon?: any }>({ open: false });
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => apiGet<any[]>('/admin/coupons'),
  });

  const coupons: any[] = (data?.data || []).filter((c: any) =>
    !search || c.code.includes(search.toUpperCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (d: CouponForm) => apiPost<any>('/admin/coupons', d),
    onSuccess: () => { toast.success('Coupon created!'); queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setModal({ open: false }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CouponForm> }) => apiPut<any>(`/admin/coupons/${id}`, data),
    onSuccess: () => { toast.success('Coupon updated!'); queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setModal({ open: false }); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiPut<any>(`/admin/coupons/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<any>(`/admin/coupons/${id}`),
    onSuccess: () => { toast.success('Coupon deactivated'); queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }); setDeleteConfirm(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const openCreate = () => { setForm({ ...defaultForm, code: generateCode() }); setModal({ open: true }); };
  const openEdit = (c: any) => {
    setForm({
      code: c.code, type: c.type, value: c.value, minPurchase: c.minPurchase || 0,
      maxDiscount: c.maxDiscount || null, usageLimit: c.usageLimit || null,
      expiresAt: c.expiresAt ? c.expiresAt.split('T')[0] : '',
      isActive: c.isActive, description: c.description || '',
    });
    setModal({ open: true, coupon: c });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, code: form.code.toUpperCase(), expiresAt: form.expiresAt || null };
    if (modal.coupon) updateMutation.mutate({ id: modal.coupon.id, data: payload });
    else createMutation.mutate(payload);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const isExpired = (c: any) => c.expiresAt && new Date(c.expiresAt) < new Date();
  const usagePercent = (c: any) => c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : null;

  return (
    <div className="space-y-6">

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{modal.coupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setModal({ open: false })} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="label">Coupon Code *</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="input flex-1 font-mono uppercase tracking-widest"
                    placeholder="SAVE20"
                    required
                    disabled={!!modal.coupon}
                  />
                  {!modal.coupon && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, code: generateCode() }))} className="btn-secondary shrink-0 text-sm">
                      Generate
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="e.g. 20% off for all users" />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Discount Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'FLAT' | 'PERCENTAGE' }))} className="input">
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Discount Value {form.type === 'PERCENTAGE' ? '(%)' : '(₹)'}</label>
                  <input type="number" min="0" max={form.type === 'PERCENTAGE' ? 100 : undefined}
                    value={form.value} onChange={e => setForm(f => ({ ...f, value: +e.target.value }))} className="input" required />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Purchase (₹)</label>
                  <input type="number" min="0" value={form.minPurchase}
                    onChange={e => setForm(f => ({ ...f, minPurchase: +e.target.value }))} className="input" />
                </div>
                {form.type === 'PERCENTAGE' && (
                  <div>
                    <label className="label">Max Discount (₹)</label>
                    <input type="number" min="0"
                      value={form.maxDiscount ?? ''}
                      onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value ? +e.target.value : null }))}
                      className="input" placeholder="No limit" />
                  </div>
                )}
              </div>

              {/* Usage & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Usage Limit</label>
                  <input type="number" min="1"
                    value={form.usageLimit ?? ''}
                    onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value ? +e.target.value : null }))}
                    className="input" placeholder="Unlimited" />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" value={form.expiresAt ?? ''}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value || null }))}
                    className="input" />
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-gray-700">Active (usable by customers)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal({ open: false })} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : modal.coupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Deactivate Coupon?</h3>
            <p className="text-sm text-gray-500 mb-5">This coupon will no longer be accepted at checkout.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons & Discounts</h1>
          <p className="text-gray-500">Create and manage discount codes for your plans</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coupons..." className="input pl-9 w-full" />
      </div>

      {/* Stats Summary */}
      {!isLoading && (data?.data || []).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Coupons', value: (data?.data || []).length, color: 'text-gray-900' },
            { label: 'Active', value: (data?.data || []).filter((c: any) => c.isActive && !isExpired(c)).length, color: 'text-emerald-600' },
            { label: 'Total Uses', value: (data?.data || []).reduce((sum: number, c: any) => sum + (c.usedCount || 0), 0), color: 'text-primary-600' },
          ].map(stat => (
            <div key={stat.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Coupons Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
            <tr>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Discount</th>
              <th className="px-5 py-4">Conditions</th>
              <th className="px-5 py-4">Usage</th>
              <th className="px-5 py-4">Expires</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center">
                <Tag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400">No coupons yet. Create your first discount code!</p>
              </td></tr>
            ) : (
              coupons.map((c: any) => {
                const expired = isExpired(c);
                const pct = usagePercent(c);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm tracking-widest">
                          {c.code}
                        </code>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-gray-400 hover:text-primary-600 transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === c.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 font-semibold text-gray-900">
                        {c.type === 'PERCENTAGE' ? <Percent className="w-4 h-4 text-primary-500" /> : <DollarSign className="w-4 h-4 text-emerald-500" />}
                        {c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
                      </div>
                      {c.maxDiscount && <p className="text-xs text-gray-400">max ₹{c.maxDiscount}</p>}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {c.minPurchase > 0 ? <p className="text-xs">Min ₹{c.minPurchase}</p> : <p className="text-xs text-gray-400">No min</p>}
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-medium text-gray-900">{c.usedCount || 0}</span>
                        {c.usageLimit ? <span className="text-gray-400">/{c.usageLimit}</span> : <span className="text-xs text-gray-400 ml-1">uses</span>}
                      </div>
                      {pct !== null && (
                        <div className="mt-1 h-1.5 bg-gray-200 rounded-full w-20">
                          <div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.expiresAt ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className={`w-3.5 h-3.5 ${expired ? 'text-rose-500' : 'text-gray-400'}`} />
                          <span className={expired ? 'text-rose-500' : 'text-gray-700'}>
                            {format(new Date(c.expiresAt), 'dd MMM yyyy')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {expired ? (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">Expired</span>
                      ) : c.isActive ? (
                        <span className="badge badge-success text-xs">Active</span>
                      ) : (
                        <span className="badge badge-danger text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {c.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
