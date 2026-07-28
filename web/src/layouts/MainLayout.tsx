import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, BookOpen, Search, Bell, User, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import SubscriptionModal from '../components/modals/SubscriptionModal';

const navLinks = [
  { label: 'Exams', path: '/exams' },
  { label: 'PDFs', path: '/pdfs' },
  { label: 'Quizzes', path: '/quizzes' },
  { label: 'Plans', path: '/subscriptions' },
];

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode, subscriptionModalOpen } = useUIStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Open<span className="text-primary-600">E</span> Academy</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className="btn-ghost p-2 rounded-lg" aria-label="Toggle dark mode">
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                        onMouseLeave={() => setUserMenuOpen(false)}
                      >
                        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                          <User className="w-4 h-4" /> Dashboard
                        </Link>
                        <Link to="/dashboard/notifications" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                          <Bell className="w-4 h-4" /> Notifications
                        </Link>
                        <hr className="border-gray-100" />
                        <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50">
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-sm px-4 py-2">Login</Link>
                  <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden btn-ghost p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 bg-white"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-lg">Open<span className="text-primary-400">E</span> Academy</span>
              </div>
              <p className="text-sm leading-relaxed">Your Gateway to Government Job Success. Premium study material for SSC, UPSC, Banking & more.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Popular Exams</h4>
              <ul className="space-y-2 text-sm">
                {['SSC CGL', 'UPSC CSE', 'Banking (IBPS)', 'Railway NTPC', 'UP Police'].map(e => (
                  <li key={e}><a href="#" className="hover:text-primary-400 transition-colors">{e}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                {['PDF Library', 'Mock Tests', 'Quiz Bank', 'Subscriptions', 'Rankings'].map(p => (
                  <li key={p}><a href="#" className="hover:text-primary-400 transition-colors">{p}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                {['Contact Us', 'Privacy Policy', 'Terms of Service', 'Refund Policy', 'FAQ'].map(s => (
                  <li key={s}><a href="#" className="hover:text-primary-400 transition-colors">{s}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2025 Open E Academy. All rights reserved.</p>
            <p className="text-sm">Made with ❤️ for competitive exam aspirants</p>
          </div>
        </div>
      </footer>

      {subscriptionModalOpen && <SubscriptionModal />}
    </div>
  );
}
