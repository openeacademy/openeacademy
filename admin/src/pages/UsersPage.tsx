import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import {
  Search, MoreVertical, Shield, Ban, CheckCircle, UserX, X,
  Loader2, Crown, CreditCard, Activity, Calendar, ChevronRight,
  Mail, Phone, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-success',
  SUSPENDED: 'badge-warning',
  BANNED: 'badge-danger',
  PENDING_VERIFICATION: 'bg-gray-100 text-gray-600',
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700',
  ADMIN: 'badge-primary',
  CONTENT_MANAGER: 'bg-indigo-100 text-indigo-700',
  STUDENT: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  STUDENT: 'Student',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [manualSubModal, setManualSubModal] = useState(false);
  const [manualSubForm, setManualSubForm] = useState({ planId: '', startDate: '', endDate: '', notes: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, statusFilter, roleFilter],
    queryFn: () => apiGet<any>('/admin/users', { page, limit: 20, search: search || undefined, status: statusFilter || undefined, role: roleFilter || undefined }),
  });

  const { data: plansData } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiGet<any[]>('/admin/plans'),
  });
  const plans = plansData?.data || [];

  const { data: userDetailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['admin-user-detail', selectedUser?.id],
    queryFn: () => selectedUser ? apiGet<any>(`/admin/users/${selectedUser.id}`) : null,
    enabled: !!selectedUser,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPatch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const manualSubMutation = useMutation({
    mutationFn: (data: any) => apiPost<any>('/subscriptions/manual-assign', data),
    onSuccess: () => {
      toast.success('Subscription assigned!');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
      setManualSubModal(false);
      setManualSubForm({ planId: '', startDate: '', endDate: '', notes: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const users = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const userDetails = userDetailsData?.data;

  const openUser = (user: any) => {
    setSelectedUser(user);
    setSelectedUserDetails(null);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Joined'],
      ...users.map((u: any) => [u.name, u.email || '', u.mobile || '', u.role, u.status, format(new Date(u.createdAt), 'dd MMM yyyy')]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">User Profile</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* User Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-2xl shrink-0">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900">{selectedUser.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {selectedUser.email && <span className="flex items-center gap-1 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{selectedUser.email}</span>}
                      {selectedUser.mobile && <span className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{selectedUser.mobile}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`badge text-xs ${ROLE_BADGE[selectedUser.role] || 'bg-gray-100 text-gray-700'}`}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</span>
                      <span className={`badge text-xs ${STATUS_BADGE[selectedUser.status] || 'bg-gray-100 text-gray-600'}`}>{selectedUser.status}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Subscriptions', value: selectedUser._count?.subscriptions || 0, icon: <CreditCard className="w-4 h-4 text-primary-500" /> },
                    { label: 'Quiz Attempts', value: selectedUser._count?.quizAttempts || 0, icon: <Activity className="w-4 h-4 text-emerald-500" /> },
                    { label: 'PDFs Accessed', value: selectedUser._count?.pdfAccesses || 0, icon: <Crown className="w-4 h-4 text-amber-500" /> },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex justify-center mb-1">{stat.icon}</div>
                      <p className="font-bold text-gray-900 text-lg">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Joined {format(new Date(selectedUser.createdAt), 'dd MMMM yyyy')}
                </p>
              </div>

              {/* Change Role */}
              <div className="p-5 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Change Role</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <button
                      key={role}
                      onClick={() => roleMutation.mutate({ id: selectedUser.id, role })}
                      disabled={selectedUser.role === role || roleMutation.isPending}
                      className={`p-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                        selectedUser.role === role
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-4 h-4 mb-1 inline-block mr-1" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscriptions */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Subscription History</h4>
                  <button
                    onClick={() => setManualSubModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Assign Plan
                  </button>
                </div>
                {detailsLoading ? (
                  <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
                ) : (userDetails?.subscriptions || []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No subscriptions yet</p>
                ) : (
                  <div className="space-y-2">
                    {(userDetails?.subscriptions || []).slice(0, 3).map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{sub.plan?.name || 'Unknown Plan'}</p>
                          <p className="text-xs text-gray-400">{format(new Date(sub.startDate), 'dd MMM yy')} → {format(new Date(sub.endDate), 'dd MMM yy')}</p>
                        </div>
                        <span className={`badge text-xs ${sub.status === 'ACTIVE' ? 'badge-success' : 'bg-gray-100 text-gray-500'}`}>{sub.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Actions</h4>
                <div className="space-y-2">
                  {selectedUser.status !== 'ACTIVE' && (
                    <button onClick={() => statusMutation.mutate({ id: selectedUser.id, status: 'ACTIVE' })} disabled={statusMutation.isPending}
                      className="btn-secondary w-full justify-center text-emerald-600 hover:bg-emerald-50">
                      <CheckCircle className="w-4 h-4" /> Activate Account
                    </button>
                  )}
                  {selectedUser.status !== 'SUSPENDED' && (
                    <button onClick={() => statusMutation.mutate({ id: selectedUser.id, status: 'SUSPENDED' })} disabled={statusMutation.isPending}
                      className="btn-secondary w-full justify-center text-amber-600 hover:bg-amber-50">
                      <Ban className="w-4 h-4" /> Suspend Account
                    </button>
                  )}
                  {selectedUser.status !== 'BANNED' && (
                    <button onClick={() => { if (confirm(`Ban ${selectedUser.name}? This prevents login.`)) statusMutation.mutate({ id: selectedUser.id, status: 'BANNED' }); }}
                      disabled={statusMutation.isPending}
                      className="btn-secondary w-full justify-center text-rose-600 hover:bg-rose-50">
                      <UserX className="w-4 h-4" /> Ban Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Subscription Modal */}
      {manualSubModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Assign Subscription</h2>
              <button onClick={() => setManualSubModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Assigning to: <strong>{selectedUser.name}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="label">Plan</label>
                <select value={manualSubForm.planId} onChange={e => setManualSubForm(f => ({ ...f, planId: e.target.value }))} className="input">
                  <option value="">— Select Plan —</option>
                  {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" value={manualSubForm.startDate} onChange={e => setManualSubForm(f => ({ ...f, startDate: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" value={manualSubForm.endDate} onChange={e => setManualSubForm(f => ({ ...f, endDate: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea value={manualSubForm.notes} onChange={e => setManualSubForm(f => ({ ...f, notes: e.target.value }))} className="input resize-none" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setManualSubModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                disabled={!manualSubForm.planId || !manualSubForm.startDate || !manualSubForm.endDate || manualSubMutation.isPending}
                onClick={() => manualSubMutation.mutate({ identifier: selectedUser.email || selectedUser.mobile || selectedUser.id, ...manualSubForm })}
                className="btn-primary flex-1"
              >
                {manualSubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Manage all registered users ({total} total)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, mobile..." className="input pl-9 w-full" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
          <option value="PENDING_VERIFICATION">Pending</option>
        </select>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto text-sm">
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No users found</td></tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openUser(user)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{user.mobile || '—'}</div>
                    {user.email && <div className="text-gray-500 text-xs">{user.email}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge text-xs ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-700'}`}>{ROLE_LABELS[user.role] || user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge text-xs ${STATUS_BADGE[user.status] || 'bg-gray-100 text-gray-600'}`}>{user.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{format(new Date(user.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1 text-xs disabled:opacity-50">Prev</button>
          <span className="text-sm font-medium text-gray-600 py-1">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1 text-xs disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
