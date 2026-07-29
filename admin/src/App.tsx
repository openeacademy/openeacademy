import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ExamsPage from './pages/ExamsPage';
import SubjectsPage from './pages/SubjectsPage';
import PDFsPage from './pages/PDFsPage';
import QuestionsPage from './pages/QuestionsPage';
import QuizzesPage from './pages/QuizzesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import PaymentsPage from './pages/PaymentsPage';
import CouponsPage from './pages/CouponsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import SeoPage from './pages/SeoPage';
import RolesPage from './pages/RolesPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="pdfs" element={<PDFsPage />} />
          <Route path="questions" element={<QuestionsPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="seo" element={<SeoPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
