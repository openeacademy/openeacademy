import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { format } from 'date-fns';

interface QuizAttempt {
  id: string;
  startedAt: string;
  completedAt: string | null;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  timeTakenSeconds: number | null;
  Quiz: {
    id: string;
    title: string;
    slug: string;
    durationMinutes: number;
    totalMarks: number;
  };
}

export default function QuizHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-attempts'],
    queryFn: () => apiGet<QuizAttempt[]>('/user/attempts'),
  });

  const attempts = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz History</h1>
        <p className="text-gray-500">View your past quiz attempts and performance.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Quiz Attempts</h3>
          <p className="text-gray-500 mb-6">You haven't attempted any quizzes yet.</p>
          <Link to="/quizzes" className="btn-primary">
            Explore Quizzes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt, i) => (
            <motion.div
              key={attempt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5 group hover:border-primary-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${attempt.completedAt ? (attempt.percentage >= 50 ? 'badge-success' : 'badge-danger') : 'badge-warning'}`}>
                      {attempt.completedAt ? (attempt.percentage >= 50 ? 'Passed' : 'Failed') : 'Incomplete'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(attempt.startedAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {attempt.Quiz?.title || 'Unknown Quiz'}
                  </h3>
                  
                  {attempt.completedAt && (
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-gray-900">{attempt.marksObtained}</span> / {attempt.totalMarks}
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-gray-900">{attempt.timeTakenSeconds ? Math.round(attempt.timeTakenSeconds / 60) : 0}m</span> / {attempt.Quiz?.durationMinutes}m
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(attempt.percentage)}%
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to={`/quiz/${attempt.Quiz?.slug}/result/${attempt.id}`}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-600 rounded-xl transition-colors shrink-0"
                >
                  <span className="text-sm font-medium">View Result</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
