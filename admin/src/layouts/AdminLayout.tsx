import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { 
  LayoutDashboard, Users, BookOpen, FileText, Trophy, CreditCard, 
  LogOut, Settings, HelpCircle, Bell, Search, Shield, ChevronDown, 
  ChevronRight, Tag, BarChart3, Globe, Activity, Layers, FolderTree,
  Sliders, UserCheck, Key, Menu, X
} from 'lucide-react';

interface NavSection {
  title: string;
  items: { icon: any; label: string; path: string }[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    title: 'Content',
    items: [
      { icon: BookOpen, label: 'Exams', path: '/exams' },
      { icon: FolderTree, label: 'Subjects', path: '/subjects' },
      { icon: FileText, label: 'PDF Library', path: '/pdfs' },
      { icon: HelpCircle, label: 'Question Bank', path: '/questions' },
      { icon: Trophy, label: 'Quiz Bank & Tests', path: '/quizzes' },
    ],
  },
  {
    title: 'People',
    items: [
      { icon: Users, label: 'Users & Controls', path: '/users' },
      { icon: Key, label: 'Roles & Permissions', path: '/roles' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { icon: Layers, label: 'Subscription Plans', path: '/subscriptions' },
      { icon: CreditCard, label: 'Payments & Refunds', path: '/payments' },
      { icon: Tag, label: 'Coupons & Discounts', path: '/coupons' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { icon: Bell, label: 'Notifications', path: '/notifications' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { icon: BarChart3, label: 'Reports & Analytics', path: '/reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: Globe, label: 'SEO Manager', path: '/seo' },
      { icon: Activity, label: 'Activity Logs', path: '/activity-logs' },
      { icon: Sliders, label: 'Settings & Config', path: '/settings' },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-30 shadow-sm transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-primary-200">
              OE
            </div>
            <div>
              <span className="font-bold text-gray-900 leading-tight block">Open E Academy</span>
              <span className="text-[11px] font-semibold text-primary-600 tracking-wider uppercase">Super Admin</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
            {(user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@openeacademy.in'}</p>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navSections.map(section => {
            const isCollapsed = collapsedSections[section.title];
            return (
              <div key={section.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-gray-400 tracking-wider uppercase hover:text-gray-600 transition-colors"
                >
                  <span>{section.title}</span>
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pt-1">
                    {section.items.map(({ icon: Icon, label, path }) => (
                      <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm shadow-primary-100/50'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 space-y-1 bg-white">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center w-full gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Settings className="w-4 h-4" /> Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="lg:ml-64 flex-1 flex flex-col min-w-0 w-full">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-10 px-4 lg:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 lg:gap-4 flex-1 max-w-md">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Global search across exams, users, or notes..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    navigate(`/users?search=${encodeURIComponent(globalSearch.trim())}`);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Environment Badge per Section 1 */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Production</span>
            </div>

            {/* Notifications Bell */}
            <button
              onClick={() => navigate('/notifications')}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
            </button>

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="w-9 h-9 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {(user?.name || 'Admin').charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name || 'Super Admin'}</p>
                <p className="text-[11px] font-medium text-primary-600">{user?.role || 'SUPER_ADMIN'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="p-4 lg:p-8 max-w-7xl mx-auto w-full flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
