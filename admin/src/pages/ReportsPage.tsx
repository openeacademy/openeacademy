import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { BarChart3, Users, IndianRupee, FileText, Trophy, Activity } from 'lucide-react';

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => apiGet<any>('/admin/reports'),
  });

  const stats = data?.data || {
    totalUsers: 0,
    totalSubscriptions: 0,
    totalRevenue: 0,
    totalPdfs: 0,
    totalQuizzes: 0,
  };

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Subscriptions', value: stats.totalSubscriptions, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total PDFs', value: stats.totalPdfs, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Total Quizzes', value: stats.totalQuizzes, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" /> Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500">Platform overview and statistics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card p-6 h-32 animate-pulse bg-white flex flex-col justify-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((card, idx) => (
            <div key={idx} className="card p-6 bg-white flex flex-col hover:shadow-lg transition-shadow border border-gray-100">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">{card.label}</h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 min-h-[400px] flex items-center justify-center border-dashed border-2 border-gray-200 bg-gray-50/50">
          <div className="text-center text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Revenue Chart (Coming Soon)</p>
          </div>
        </div>
        <div className="card p-6 min-h-[400px] flex items-center justify-center border-dashed border-2 border-gray-200 bg-gray-50/50">
          <div className="text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>User Growth Chart (Coming Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
