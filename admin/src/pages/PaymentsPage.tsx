import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import {
  Search, DollarSign, TrendingUp, RotateCcw, Clock, CheckCircle,
  XCircle, AlertCircle, Download, X, Loader2, FileText, User, Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  COMPLETED: { badge: 'badge-success', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  PENDING:   { badge: 'bg-amber-100 text-amber-700',   icon: <Clock className="w-3.5 h-3.5" /> },
  FAILED:    { badge: 'badge-danger',  icon: <XCircle className="w-3.5 h-3.5" /> },
  REFUNDED:  { badge: 'bg-violet-100 text-violet-700', icon: <RotateCcw className="w-3.5 h-3.5" /> },
};

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refundModal, setRefundModal] = useState<{ open: boolean; payment?: any }>({ open: false });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page, search, statusFilter, dateFrom, dateTo],
    queryFn: () => apiGet<any>('/admin/payments', {
      page, limit: 20,
      search: search || undefined,
      status: statusFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: () => apiGet<any>('/admin/payment-stats'),
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiPost<any>(`/admin/payments/${id}/refund`, { reason }),
    onSuccess: () => {
      toast.success('Refund processed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payment-stats'] });
      setRefundModal({ open: false });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Refund failed'),
  });

  const payments = data?.data || [];
  const meta = data?.meta || {};
  const stats = statsData?.data || {};

  const handleExportCSV = () => {
    const rows = [
      ['Invoice', 'User', 'Email', 'Plan', 'Amount', 'GST', 'Discount', 'Final', 'Status', 'Date'],
      ...payments.map((p: any) => [
        p.invoiceNumber || '-',
        p.user?.name || '-',
        p.user?.email || p.user?.mobile || '-',
        p.plan?.name || '-',
        p.amount, p.gstAmount, p.discountAmount, p.finalAmount,
        p.status,
        format(new Date(p.createdAt), 'dd MMM yyyy HH:mm'),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  const [refundReason, setRefundReason] = useState('');

  return (
    <div className="space-y-6">

      {/* Refund Modal */}
      {refundModal.open && refundModal.payment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Process Refund</h2>
              <button onClick={() => setRefundModal({ open: false })} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice</span>
                <span className="font-mono font-medium text-gray-900">{refundModal.payment.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">User</span>
                <span className="font-medium text-gray-900">{refundModal.payment.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-900">{refundModal.payment.plan?.name}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="font-semibold text-gray-700">Refund Amount</span>
                <span className="font-bold text-rose-600">₹{refundModal.payment.finalAmount?.toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-5">
              <label className="label">Reason for Refund *</label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="input resize-none" rows={3}
                placeholder="e.g. User requested cancellation within 24h..."
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
              ⚠️ This will mark the payment as REFUNDED and deactivate the user's subscription.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal({ open: false })} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => refundMutation.mutate({ id: refundModal.payment.id, reason: refundReason })}
                disabled={refundMutation.isPending || !refundReason.trim()}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {refundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" /> Process Refund</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Refunds</h1>
          <p className="text-gray-500">Track all transactions, manage refunds</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`} sub="All time" icon={<DollarSign className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />
        <StatCard label="Today's Revenue" value={`₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}`} sub={format(new Date(), 'dd MMM yyyy')} icon={<TrendingUp className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
        <StatCard label="Pending Payments" value={String(stats.pendingCount || 0)} sub="Awaiting verification" icon={<Clock className="w-5 h-5 text-amber-600" />} color="bg-amber-50" />
        <StatCard label="Total Refunded" value={`₹${(stats.refundedAmount || 0).toLocaleString('en-IN')}`} sub={`${stats.refundedCount || 0} transactions`} icon={<RotateCcw className="w-5 h-5 text-violet-600" />} color="bg-violet-50" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search invoice, user, email..." className="input pl-9 w-full" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto">
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" title="From date" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" title="To date" />
          {(search || statusFilter || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }} className="btn-secondary text-sm">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
            <tr>
              <th className="px-5 py-4">Invoice / User</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No payments found</td></tr>
            ) : (
              payments.map((p: any) => {
                const st = STATUS_STYLES[p.status] || STATUS_STYLES['PENDING'];
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{p.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.invoiceNumber || p.id?.slice(0, 12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-900">{p.plan?.name || '—'}</p>
                      {p.discountAmount > 0 && (
                        <p className="text-xs text-emerald-600">-₹{p.discountAmount} discount</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">₹{p.finalAmount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">incl. ₹{p.gstAmount?.toFixed(2)} GST</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge text-xs flex items-center gap-1 w-fit ${st.badge}`}>
                        {st.icon} {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-900">{format(new Date(p.createdAt), 'dd MMM yyyy')}</p>
                      <p className="text-xs text-gray-400">{format(new Date(p.createdAt), 'hh:mm a')}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.invoiceNumber && (
                          <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="View Invoice">
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'COMPLETED' && (
                          <button
                            onClick={() => { setRefundReason(''); setRefundModal({ open: true, payment: p }); }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Refund"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1 text-xs disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {meta.totalPages}</span>
          <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1 text-xs disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
