import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Bell, FileText, Calendar, ChevronRight, TrendingUp, Award } from 'lucide-react';
import { apiGet, resolvePublicUrl } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';

interface DashboardData {
  user: { id: string; name: string; email: string; avatar?: string; createdAt: string };
  activeSubscription: {
    id: string; status: string; endDate: string; isLifetime: boolean;
    plan: { name: string; type: string; duration: string };
  } | null;
  recentPDFs: Array<{ id: string; lastPage: number; readingProgress: number; lastAccessAt: string; pdf: { id: string; title: string; slug: string; thumbnailUrl?: string; totalPages?: number } }>;
  bookmarks: Array<{ id: string; page?: number; pdf: { id: string; title: string; slug: string; thumbnailUrl?: string } }>;
  recentAttempts: Array<{ id: string; marksObtained: number; totalMarks: number; percentage: number; completedAt?: string }>;
  unreadNotifications: number;
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`card p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => apiGet<DashboardData>('/user/dashboard'),
  });

  const dashboard = data?.data;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-7xl w-full space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-primary-200 mt-1">
              {dashboard?.activeSubscription
                ? `${dashboard.activeSubscription.plan.name} · Valid till ${format(new Date(dashboard.activeSubscription.endDate), 'dd MMM yyyy')}`
                : 'No active subscription. Start learning today!'}
            </p>
          </div>
          {!dashboard?.activeSubscription && (
            <Link to="/subscriptions" className="btn-primary bg-white text-primary-600 hover:bg-primary-50 py-2.5 px-6 shrink-0">
              Get Subscription
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="PDFs Accessed" value={dashboard?.recentPDFs?.length || 0} color="text-primary-600" bg="bg-primary-50" />
        <StatCard icon={Trophy} label="Quiz Attempts" value={dashboard?.recentAttempts?.length || 0} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={BookOpen} label="Bookmarks" value={dashboard?.bookmarks?.length || 0} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={Bell} label="Notifications" value={dashboard?.unreadNotifications || 0} color="text-violet-600" bg="bg-violet-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continue Reading */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Continue Reading</h2>
            <Link to="/pdfs" className="text-xs text-primary-600 hover:underline flex items-center gap-1">Browse <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {dashboard?.recentPDFs?.length ? (
            <div className="space-y-3">
              {dashboard.recentPDFs.slice(0, 4).map(access => (
                <Link key={access.id} to={`/read/${access.pdf.slug}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-12 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                    {access.pdf.thumbnailUrl
                      ? <img src={resolvePublicUrl(access.pdf.thumbnailUrl)} className="w-full h-full object-cover rounded-lg" alt="" />
                      : <FileText className="w-5 h-5 text-primary-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">{access.pdf.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1">
                        <div className="bg-primary-500 h-1 rounded-full" style={{ width: `${access.readingProgress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{access.readingProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recent PDFs. Start reading!</p>
              <Link to="/pdfs" className="btn-primary text-xs mt-3 py-1.5 px-4">Browse PDFs</Link>
            </div>
          )}
        </div>

        {/* Recent Quiz Attempts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Quiz Attempts</h2>
            <Link to="/quizzes" className="text-xs text-primary-600 hover:underline flex items-center gap-1">Browse <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {dashboard?.recentAttempts?.length ? (
            <div className="space-y-3">
              {dashboard.recentAttempts.slice(0, 4).map(attempt => (
                <div key={attempt.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${attempt.percentage >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {attempt.percentage.toFixed(0)}%
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{attempt.marksObtained}/{attempt.totalMarks} marks</p>
                      {attempt.completedAt && <p className="text-xs text-gray-400">{format(new Date(attempt.completedAt), 'dd MMM')}</p>}
                    </div>
                  </div>
                  <TrendingUp className={`w-4 h-4 ${attempt.percentage >= 60 ? 'text-emerald-500' : 'text-rose-400'}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No quiz attempts yet. Take a quiz!</p>
              <Link to="/quizzes" className="btn-primary text-xs mt-3 py-1.5 px-4">Start Quiz</Link>
            </div>
          )}
        </div>
      </div>

      {/* Bookmarks */}
      {dashboard?.bookmarks?.length ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Bookmarks</h2>
            <Link to="/dashboard/bookmarks" className="text-xs text-primary-600 hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dashboard.bookmarks.slice(0, 6).map(bm => (
              <Link key={bm.id} to={`/read/${bm.pdf?.slug}`} className="flex items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <BookOpen className="w-4 h-4 text-primary-400 shrink-0" />
                <p className="text-xs text-gray-700 truncate group-hover:text-primary-600">{bm.pdf?.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
