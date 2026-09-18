import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiDelete } from '../lib/api';
import {
  Search, MoreVertical, Shield, Ban, CheckCircle, UserX, X,
  Loader2, Crown, CreditCard, Activity, Calendar, ChevronRight,
  Mail, Phone, Download, Plus, Eye, EyeOff,
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
  
  // Create User State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'USER' });
  const [showPassword, setShowPassword] = useState(false);
  
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

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/users/${id}?hard=true`),
    onSuccess: () => {
      toast.success('User permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
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

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiPost('/admin/users', data),
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsCreateModalOpen(false);
      setCreateUserForm({ name: '', email: '', mobile: '', password: '', role: 'USER' });
      setShowPassword(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create user'),
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



              {/* Subscriptions */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Active Plan</h4>
                  <button
                    onClick={() => setManualSubModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 bg-primary-50 px-2 py-1 rounded border border-primary-200"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Change Plan
                  </button>
                </div>
                {detailsLoading ? (
                  <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
                ) : (userDetails?.subscriptions || []).filter((s: any) => s.status === 'ACTIVE').length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                    No active plan found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(userDetails?.subscriptions || []).filter((s: any) => s.status === 'ACTIVE').map((sub: any) => (
                      <div key={sub.id} className="flex flex-col gap-2 p-4 bg-primary-50 border border-primary-200 rounded-xl text-sm shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Crown className="w-16 h-16 text-primary-600" />
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                          <div>
                            <p className="font-bold text-primary-900 text-base">{sub.plan?.name || 'Unknown Plan'}</p>
                            <p className="text-xs text-primary-700/70 font-medium mt-1">Valid till {format(new Date(sub.endDate), 'dd MMM yyyy')}</p>
                          </div>
                          <span className="badge badge-success text-xs">ACTIVE</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Account Actions</h4>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => statusMutation.mutate({ id: selectedUser.id, status: 'ACTIVE' })} disabled={statusMutation.isPending || selectedUser.status === 'ACTIVE'}
                    className={`btn-secondary justify-center text-emerald-600 hover:bg-emerald-50 ${selectedUser.status === 'ACTIVE' ? 'opacity-50' : ''}`}>
                    <CheckCircle className="w-4 h-4" /> Activate
                  </button>
                  <button onClick={() => statusMutation.mutate({ id: selectedUser.id, status: 'SUSPENDED' })} disabled={statusMutation.isPending || selectedUser.status === 'SUSPENDED'}
                    className={`btn-secondary justify-center text-amber-600 hover:bg-amber-50 ${selectedUser.status === 'SUSPENDED' ? 'opacity-50' : ''}`}>
                    <Ban className="w-4 h-4" /> Suspend
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { if (confirm(`Soft Delete (Ban) ${selectedUser.name}? This prevents login.`)) statusMutation.mutate({ id: selectedUser.id, status: 'BANNED' }); }}
                    disabled={statusMutation.isPending || selectedUser.status === 'BANNED'}
                    className={`btn-secondary justify-center text-rose-600 hover:bg-rose-50 ${selectedUser.status === 'BANNED' ? 'opacity-50' : ''}`}>
                    <UserX className="w-4 h-4" /> Soft Delete
                  </button>
                  <button onClick={() => { if (confirm(`HARD DELETE ${selectedUser.name}? This permanently removes all their data from the database. This action cannot be undone.`)) hardDeleteMutation.mutate(selectedUser.id); }}
                    disabled={hardDeleteMutation.isPending}
                    className="btn-secondary justify-center text-white bg-rose-600 hover:bg-rose-700 border-transparent">
                    <UserX className="w-4 h-4" /> Hard Delete
                  </button>
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
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create User
          </button>
          <button onClick={handleExportCSV} className="btn-secondary text-sm">
            <Download className="w-4 h-4 mr-1.5" /> Export
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

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Full Name *</label>
                <input 
                  type="text" 
                  value={createUserForm.name} 
                  onChange={e => setCreateUserForm(f => ({ ...f, name: e.target.value }))} 
                  className="input" 
                  placeholder="John Doe" 
                />
              </div>
              
              <div>
                <label className="label">Email Address</label>
                <input 
                  type="email" 
                  value={createUserForm.email} 
                  onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))} 
                  className="input" 
                  placeholder="user@example.com" 
                />
              </div>
              
              <div>
                <label className="label">Mobile Number</label>
                <input 
                  type="tel" 
                  value={createUserForm.mobile} 
                  onChange={e => setCreateUserForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} 
                  className="input" 
                  placeholder="10-digit mobile" 
                />
                <p className="text-xs text-gray-400 mt-1">Provide at least Email OR Mobile</p>
              </div>
              
              <div>
                <label className="label">Temporary Password *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={createUserForm.password} 
                    onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))} 
                    className="input pr-10" 
                    placeholder="Min 6 characters" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="label">System Role *</label>
                <select 
                  value={createUserForm.role} 
                  onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value }))} 
                  className="input"
                >
                  <option value="USER">Student</option>
                  <option value="CONTENT_MANAGER">Content Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button 
                disabled={createUserMutation.isPending || !createUserForm.name || !createUserForm.password || (!createUserForm.email && !createUserForm.mobile)}
                onClick={() => {
                  createUserMutation.mutate({
                    ...createUserForm,
                    email: createUserForm.email || undefined,
                    mobile: createUserForm.mobile || undefined,
                  });
                }} 
                className="btn-primary flex-1"
              >
                {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
