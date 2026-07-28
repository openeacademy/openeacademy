import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Open<span className="text-primary-600">E</span> Academy</span>
        </Link>
      </header>

      {/* Auth content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-gray-400">
        © 2025 Open E Academy. All rights reserved.
      </footer>
    </div>
  );
}
