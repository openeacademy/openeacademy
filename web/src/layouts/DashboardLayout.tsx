import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, Trophy, Bell, CreditCard, Settings, User, LogOut, Menu, X, Bookmark, History, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

type SidebarLink = {
  icon: any;
  label: string;
  path: string;
  requiredFeature?: string;
};

const sidebarLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'My Exams', path: '/exams', requiredFeature: 'access_all_exams' },
  { icon: FileText, label: 'PDF Library', path: '/pdfs', requiredFeature: 'access_all_pdfs' },
  { icon: Trophy, label: 'Quiz Bank', path: '/quizzes', requiredFeature: 'access_all_quizzes' },
  { icon: Bookmark, label: 'Bookmarks', path: '/dashboard/bookmarks' },
  { icon: History, label: 'Quiz History', path: '/dashboard/quiz-history' },
  { icon: Zap, label: 'Subscription Plans', path: '/subscriptions' },
  { icon: Bell, label: 'Notifications', path: '/dashboard/notifications' },
  { icon: CreditCard, label: 'Payments', path: '/dashboard/payments' },
  { icon: User, label: 'Profile', path: '/dashboard/profile' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const { data: dashboardData } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => apiGet<any>('/user/dashboard'),
  });

  const features = dashboardData?.data?.activeSubscription?.plan?.features || [];

  const visibleLinks = sidebarLinks.filter(link => {
    if (!link.requiredFeature) return true;
    return features.includes(link.requiredFeature);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed lg:static inset-y-0 left-0 z-30 w-64 h-full bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-sm"
          >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100 shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Open<span className="text-primary-600">E</span></span>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || user?.mobile}</p>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {visibleLinks.map(({ icon: Icon, label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/dashboard'}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={({ isActive }) => {
                    const isExactOrChild = isActive || (path !== '/dashboard' && location.pathname.startsWith(path));
                    return `sidebar-item ${isExactOrChild ? 'active' : ''}`;
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-3 py-4 border-t border-gray-100 shrink-0">
              <button onClick={handleLogout} className="sidebar-item w-full text-rose-600 hover:bg-rose-50">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar (Fixed) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0 shadow-xs">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost p-2 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <Link to="/" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">
            ← Back to Site
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
