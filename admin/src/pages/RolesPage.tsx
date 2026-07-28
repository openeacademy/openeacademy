import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../lib/api';
import { Search, Shield, Check, Users, BookOpen, CreditCard, BarChart2, Settings, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Permission Definitions ──────────────────────────────────────────────────

const PERMISSION_GROUPS = [
  {
    id: 'user_mgmt',
    label: 'User Management',
    icon: <Users className="w-4 h-4" />,
    permissions: [
      { key: 'view_users',      label: 'View Users',           description: 'List and search registered users' },
      { key: 'edit_users',      label: 'Edit User Status',     description: 'Activate, suspend or ban users' },
      { key: 'change_roles',    label: 'Change Roles',         description: 'Promote or demote user roles' },
      { key: 'assign_subs',     label: 'Assign Subscriptions', description: 'Manually assign plans to users' },
      { key: 'delete_users',    label: 'Delete / Ban Users',   description: 'Permanently restrict accounts' },
    ],
  },
  {
    id: 'content_mgmt',
    label: 'Content Management',
    icon: <BookOpen className="w-4 h-4" />,
    permissions: [
      { key: 'view_content',    label: 'View Content',         description: 'View exams, PDFs, quizzes' },
      { key: 'create_content',  label: 'Create Content',       description: 'Add new exams, subjects, PDFs, quizzes' },
      { key: 'edit_content',    label: 'Edit Content',         description: 'Modify existing content' },
      { key: 'delete_content',  label: 'Delete Content',       description: 'Remove content permanently' },
      { key: 'manage_questions','label': 'Manage Questions',   description: 'CRUD operations on question bank' },
      { key: 'publish_content', label: 'Publish / Unpublish',  description: 'Control content visibility' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Billing',
    icon: <CreditCard className="w-4 h-4" />,
    permissions: [
      { key: 'view_payments',   label: 'View Payments',        description: 'See all payment transactions' },
      { key: 'process_refunds', label: 'Process Refunds',      description: 'Issue refunds for payments' },
      { key: 'manage_plans',    label: 'Manage Plans',         description: 'Create and edit subscription plans' },
      { key: 'manage_coupons',  label: 'Manage Coupons',       description: 'Create and manage discount codes' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics & Reports',
    icon: <BarChart2 className="w-4 h-4" />,
    permissions: [
      { key: 'view_dashboard',  label: 'View Dashboard',       description: 'Access main analytics dashboard' },
      { key: 'view_reports',    label: 'View Reports',         description: 'Access detailed revenue and user reports' },
      { key: 'export_data',     label: 'Export Data',          description: 'Download CSV exports of data' },
      { key: 'view_logs',       label: 'View Activity Logs',   description: 'Access audit trail and activity logs' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings & Configuration',
    icon: <Settings className="w-4 h-4" />,
    permissions: [
      { key: 'manage_settings', label: 'Manage Settings',      description: 'Edit app settings and configuration' },
      { key: 'send_notifs',     label: 'Send Notifications',   description: 'Push and email notifications to users' },
      { key: 'manage_roles',    label: 'Manage Roles',         description: 'Configure role permissions (Super Admin only)' },
    ],
  },
];

// ─── Role Definitions (which permissions each role has by default) ────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'view_users', 'edit_users', 'change_roles', 'assign_subs', 'delete_users',
    'view_content', 'create_content', 'edit_content', 'delete_content', 'manage_questions', 'publish_content',
    'view_payments', 'process_refunds', 'manage_plans', 'manage_coupons',
    'view_dashboard', 'view_reports', 'export_data', 'view_logs',
    'manage_settings', 'send_notifs', 'manage_roles',
  ],
  ADMIN: [
    'view_users', 'edit_users', 'change_roles', 'assign_subs',
    'view_content', 'create_content', 'edit_content', 'delete_content', 'manage_questions', 'publish_content',
    'view_payments', 'process_refunds', 'manage_plans', 'manage_coupons',
    'view_dashboard', 'view_reports', 'export_data', 'view_logs',
    'manage_settings', 'send_notifs',
  ],
  CONTENT_MANAGER: [
    'view_users',
    'view_content', 'create_content', 'edit_content', 'manage_questions', 'publish_content',
    'view_dashboard',
  ],
  STUDENT: [
    'view_content',
  ],
};

const ROLE_STYLES: Record<string, { card: string; badge: string; label: string; desc: string }> = {
  SUPER_ADMIN: {
    card: 'border-violet-200 bg-violet-50',
    badge: 'bg-violet-600 text-white',
    label: 'Super Admin',
    desc: 'Full unrestricted access to every part of the platform.',
  },
  ADMIN: {
    card: 'border-primary-200 bg-primary-50',
    badge: 'bg-primary-600 text-white',
    label: 'Admin',
    desc: 'Full access except role management and system-level config.',
  },
  CONTENT_MANAGER: {
    card: 'border-indigo-200 bg-indigo-50',
    badge: 'bg-indigo-600 text-white',
    label: 'Content Manager',
    desc: 'Can create and manage content, but no financial or user control.',
  },
  STUDENT: {
    card: 'border-gray-200 bg-gray-50',
    badge: 'bg-gray-600 text-white',
    label: 'Student',
    desc: 'Standard learner with access only to their own content and progress.',
  },
};

function PermissionRow({ perm, hasPermission }: { perm: { key: string; label: string; description: string }; hasPermission: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${hasPermission ? 'bg-primary-600' : 'bg-gray-200'}`}>
        {hasPermission && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${hasPermission ? 'text-gray-900' : 'text-gray-400'}`}>{perm.label}</p>
        <p className="text-xs text-gray-400">{perm.description}</p>
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [activeRole, setActiveRole] = useState('ADMIN');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('user_mgmt');
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteRole, setPromoteRole] = useState('ADMIN');
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-search', promoteSearch],
    queryFn: () => promoteSearch.length >= 3 ? apiGet<any>('/admin/users', { search: promoteSearch, limit: 5 }) : null,
    enabled: promoteSearch.length >= 3,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPatch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setPromoteSearch('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const currentPerms = ROLE_PERMISSIONS[activeRole] || [];
  const searchResults = usersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-500">View role capabilities and assign roles to users</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Role Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Available Roles</h2>
          {Object.entries(ROLE_STYLES).map(([role, style]) => {
            const perms = ROLE_PERMISSIONS[role] || [];
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  isActive ? style.card + ' border-2' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge text-xs font-bold ${style.badge}`}>{style.label}</span>
                  <span className="text-xs text-gray-500">{perms.length} permissions</span>
                </div>
                <p className="text-sm text-gray-600">{style.desc}</p>
                {isActive && (
                  <div className="mt-2 flex items-center gap-1 text-primary-600 text-xs font-medium">
                    <Shield className="w-3.5 h-3.5" /> Viewing permissions →
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Permission Details */}
        <div className="xl:col-span-2 space-y-4">
          {/* Role Summary */}
          <div className={`rounded-2xl border-2 p-5 ${ROLE_STYLES[activeRole]?.card}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ROLE_STYLES[activeRole]?.badge}`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{ROLE_STYLES[activeRole]?.label}</h3>
                <p className="text-sm text-gray-600">{currentPerms.length} of {PERMISSION_GROUPS.flatMap(g => g.permissions).length} permissions granted</p>
              </div>
              <div className="ml-auto">
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round((currentPerms.length / PERMISSION_GROUPS.flatMap(g => g.permissions).length) * 100)}%
                  </span>
                  <p className="text-xs text-gray-500">access level</p>
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-current rounded-full transition-all"
                style={{ width: `${Math.round((currentPerms.length / PERMISSION_GROUPS.flatMap(g => g.permissions).length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Permission Groups */}
          <div className="space-y-3">
            {PERMISSION_GROUPS.map(group => {
              const granted = group.permissions.filter(p => currentPerms.includes(p.key)).length;
              const isExpanded = expandedGroup === group.id;
              return (
                <div key={group.id} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${granted === group.permissions.length ? 'bg-primary-100 text-primary-600' : granted > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                        {group.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-sm">{group.label}</p>
                        <p className="text-xs text-gray-500">{granted}/{group.permissions.length} permissions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {group.permissions.map(p => (
                          <div key={p.key} className={`w-2 h-2 rounded-full ${currentPerms.includes(p.key) ? 'bg-primary-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 divide-y divide-gray-50">
                      {group.permissions.map(perm => (
                        <PermissionRow key={perm.key} perm={perm} hasPermission={currentPerms.includes(perm.key)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Promote User Section */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-1">Assign Role to User</h2>
        <p className="text-sm text-gray-500 mb-4">Search for a user and assign them a new role</p>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={promoteSearch}
              onChange={e => setPromoteSearch(e.target.value)}
              placeholder="Search by name, email, or mobile..."
              className="input pl-9 w-full"
            />
          </div>
          <select value={promoteRole} onChange={e => setPromoteRole(e.target.value)} className="input w-auto">
            {Object.entries(ROLE_STYLES).map(([r, s]) => <option key={r} value={r}>{s.label}</option>)}
          </select>
        </div>

        {/* Search Results */}
        {promoteSearch.length >= 3 && (
          <div className="mt-3 space-y-2">
            {usersLoading ? (
              <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No users found</p>
            ) : (
              searchResults.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email || user.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{ROLE_STYLES[user.role]?.label || user.role}</span>
                    <button
                      onClick={() => roleMutation.mutate({ id: user.id, role: promoteRole })}
                      disabled={user.role === promoteRole || roleMutation.isPending}
                      className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                    >
                      {roleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `Set ${ROLE_STYLES[promoteRole]?.label}`}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {promoteSearch.length > 0 && promoteSearch.length < 3 && (
          <p className="text-xs text-gray-400 mt-2">Type at least 3 characters to search</p>
        )}
      </div>
    </div>
  );
}
