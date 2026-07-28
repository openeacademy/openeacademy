import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</p>
        <p className="text-gray-500 mb-6">The page you are looking for does not exist in the admin panel.</p>
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" /> Go Dashboard
        </Link>
      </div>
    </div>
  );
}
