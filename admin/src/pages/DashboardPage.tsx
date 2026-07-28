import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { 
  Users, CreditCard, BookOpen, FileText, Trophy, TrendingUp, UserPlus, 
  CheckCircle2, AlertCircle, ArrowUpRight, Award, Clock
} from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiGet<any>('/admin/dashboard'),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-700 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Failed to load dashboard analytics</h3>
          <p className="text-sm">Please verify backend server connectivity on port 5000.</p>
        </div>
      </div>
    );
  }

  const { stats, charts, tables } = data.data;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'bg-blue-500 text-white', sub: `${stats.todayRegistrations || 0} today` },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions || 0, icon: CheckCircle2, color: 'bg-emerald-500 text-white', sub: 'Paid & Active' },
    { label: "Today's Revenue", value: `₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'bg-amber-500 text-white', sub: 'Last 24 hours' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: CreditCard, color: 'bg-purple-500 text-white', sub: 'Lifetime gross' },
    { label: "Today's Registrations", value: stats.todayRegistrations || 0, icon: UserPlus, color: 'bg-indigo-500 text-white', sub: 'New students' },
    { label: 'Total Exams', value: stats.totalExams || 0, icon: BookOpen, color: 'bg-cyan-500 text-white', sub: 'Active courses' },
    { label: 'Total PDFs', value: stats.totalPDFs || 0, icon: FileText, color: 'bg-pink-500 text-white', sub: 'Study notes' },
    { label: 'Quiz Attempts Today', value: stats.quizAttemptsToday || 0, icon: Trophy, color: 'bg-orange-500 text-white', sub: 'Student tests' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Executive Analytics & Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Live metrics across Open E Academy platform</p>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs">
          Auto-refreshing every 60s
        </div>
      </div>

      {/* 8 Stat Cards per Section 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-1.5">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{card.sub}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* 6 Charts & Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend (Line/Bar Representation) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">7-Day Revenue Trend</h3>
            <p className="text-xs text-gray-500">Gross collections over the last week</p>
          </div>
          <div className="mt-6 space-y-3">
            {(charts?.revenueTrend || []).map((item: any, idx: number) => {
              const maxVal = Math.max(...(charts?.revenueTrend || []).map((t: any) => t.value), 1000);
              const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.date}</span>
                    <span className="text-emerald-600 font-bold">₹{(item.value || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Growth Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">7-Day User Growth</h3>
            <p className="text-xs text-gray-500">New student registrations per day</p>
          </div>
          <div className="mt-6 space-y-3">
            {(charts?.userGrowth || []).map((item: any, idx: number) => {
              const maxVal = Math.max(...(charts?.userGrowth || []).map((t: any) => t.value), 10);
              const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.date}</span>
                    <span className="text-indigo-600 font-bold">+{item.value || 0} students</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Plan Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Plan Distribution</h3>
            <p className="text-xs text-gray-500">Active subscribers across plans</p>
          </div>
          <div className="mt-6 space-y-4">
            {(charts?.planDistribution || []).length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No active subscriptions assigned yet.</p>
            ) : (
              (charts?.planDistribution || []).map((item: any, idx: number) => {
                const colors = ['bg-primary-600', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                      <span className="text-sm font-bold text-gray-800">{item.name}</span>
                    </div>
                    <span className="text-sm font-extrabold text-primary-600 bg-white px-3 py-1 rounded-lg border border-gray-200">
                      {item.value} users
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Second Charts Row: Popular Exams, Popular PDFs, Quiz Attempts Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Exams */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-base">Popular Exams</h3>
          <p className="text-xs text-gray-500 mb-4">By study content & quiz availability</p>
          <div className="space-y-3">
            {(charts?.popularExams || []).map((exam: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-bold text-gray-800 truncate max-w-[180px]">{exam.name}</span>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">📄 {exam.pdfs || 0}</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">🏆 {exam.quizzes || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular PDFs */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-base">Top Study Notes (PDFs)</h3>
          <p className="text-xs text-gray-500 mb-4">Highest view & download activity</p>
          <div className="space-y-3">
            {(charts?.popularPDFs || []).map((pdf: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-bold text-gray-800 truncate max-w-[180px]">{pdf.title}</span>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">👁️ {pdf.views || 0}</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">⬇️ {pdf.downloads || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Attempts Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-base">7-Day Quiz Attempts</h3>
          <p className="text-xs text-gray-500 mb-4">Student mock test activity</p>
          <div className="space-y-3">
            {(charts?.quizAttemptsTrend || []).map((item: any, idx: number) => {
              const maxVal = Math.max(...(charts?.quizAttemptsTrend || []).map((t: any) => t.value), 10);
              const pct = Math.min(100, Math.round((item.value / maxVal) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.date}</span>
                    <span className="text-orange-600 font-bold">{item.value || 0} tests</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tables Section per Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Recent Registrations</h3>
              <p className="text-xs text-gray-500">Latest students onboarded</p>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(tables?.recentRegistrations || []).slice(0, 6).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[130px]">{u.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs truncate max-w-[150px]">{u.email || u.mobile}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performing Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Top Performing Students</h3>
              <p className="text-xs text-gray-500">By highest test scores & completion accuracy</p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Quiz Attempted</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {(tables?.topPerformingUsers || []).slice(0, 6).map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 truncate max-w-[140px]">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs truncate max-w-[160px]">
                      {item.quizTitle}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-primary-600">
                      {item.score}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {item.percentage ? `${item.percentage.toFixed(1)}%` : '100%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
