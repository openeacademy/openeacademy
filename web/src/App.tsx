import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Suspense, lazy, useEffect } from 'react';
import { apiGet } from './lib/api';

// Layouts
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Eager pages (critical path)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';

// Lazy pages (code split)
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const ExamDetailPage = lazy(() => import('./pages/ExamDetailPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const PDFLibraryPage = lazy(() => import('./pages/PDFLibraryPage'));
const PDFReaderPage = lazy(() => import('./pages/PDFReaderPage'));
const QuizListPage = lazy(() => import('./pages/QuizListPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const QuizResultPage = lazy(() => import('./pages/QuizResultPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const WebviewCheckout = lazy(() => import('./pages/WebviewCheckout'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const BookmarksPage = lazy(() => import('./pages/dashboard/BookmarksPage'));
const NotificationsPage = lazy(() => import('./pages/dashboard/NotificationsPage'));
const PaymentHistoryPage = lazy(() => import('./pages/dashboard/PaymentHistoryPage'));
const QuizHistoryPage = lazy(() => import('./pages/dashboard/QuizHistoryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guest-only route
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Shared layout for logged-in and public views
function SharedLayout() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <DashboardLayout /> : <MainLayout />;
}

export default function App() {
  const { isAuthenticated, updateUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      apiGet<any>('/auth/me')
        .then((res) => {
          if (res.data) updateUser(res.data);
        })
        .catch(console.error);
    }
  }, [isAuthenticated, updateUser]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page is strictly MainLayout */}
          <Route element={<MainLayout />}>
            <Route index element={<LandingPage />} />
          </Route>

          {/* Shared routes (Dashboard if logged in, MainLayout if guest) */}
          <Route element={<SharedLayout />}>
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/:slug" element={<ExamDetailPage />} />
            <Route path="exams/:examSlug/subjects/:subjectId" element={<SubjectPage />} />
            <Route path="pdfs" element={<PDFLibraryPage />} />
            <Route path="quizzes" element={<QuizListPage />} />
            <Route path="subscriptions" element={<SubscriptionPage />} />
            <Route path="checkout/:planId" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          </Route>

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          </Route>

          {/* PDF reader — handles auth check internally to preserve redirect slug */}
          <Route path="read/:slug" element={<PDFReaderPage />} />

          {/* Mobile Webview Checkout */}
          <Route path="webview-checkout/:planId" element={<WebviewCheckout />} />

          {/* Protected — Quiz */}
          <Route path="quiz/:slug" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="quiz/:slug/result/:attemptId" element={<ProtectedRoute><QuizResultPage /></ProtectedRoute>} />

          {/* Protected dashboard */}
          <Route path="dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="bookmarks" element={<BookmarksPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="payments" element={<PaymentHistoryPage />} />
            <Route path="quiz-history" element={<QuizHistoryPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
