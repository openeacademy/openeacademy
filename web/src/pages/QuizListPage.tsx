import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Trophy, Clock, Users, ChevronRight, Lock } from 'lucide-react';
import { apiGet } from '../lib/api';
import type { Quiz } from '../types';

const typeLabel: Record<string, string> = {
  TOPIC_QUIZ: 'Topic', SUBJECT_QUIZ: 'Subject', FULL_EXAM_QUIZ: 'Full Exam',
  MOCK_TEST: 'Mock Test', DAILY_QUIZ: 'Daily', WEEKLY_QUIZ: 'Weekly',
};

function QuizCard({ quiz, index }: { quiz: Quiz; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card p-5 group hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-primary text-xs">{typeLabel[quiz.type] || quiz.type}</span>
            {quiz.requiresSubscription && <span className="badge badge-warning text-xs"><Lock className="w-3 h-3" /> Premium</span>}
            {quiz.isFeatured && <span className="badge badge-success text-xs">Featured</span>}
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">{quiz.title}</h3>
          {quiz.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{quiz.description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {quiz.durationMinutes} min</span>
        <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {quiz.totalMarks} marks</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {quiz._count?.attempts || 0} attempts</span>
      </div>

      {quiz.exam && (
        <p className="text-xs text-primary-600 mb-3 font-medium">{quiz.exam.name}</p>
      )}

      <Link to={`/quiz/${quiz.slug}`} className="btn-primary w-full justify-center text-sm py-2">
        <Trophy className="w-4 h-4" /> Start Quiz
      </Link>
    </motion.div>
  );
}

function QuizSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-4 w-16 rounded-full" />
      <div className="skeleton h-5 w-full" />
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-8 rounded-xl" />
    </div>
  );
}

export default function QuizListPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes', { search, type }],
    queryFn: () => apiGet<Quiz[]>('/quizzes', { search: search || undefined, type: type || undefined, limit: '24' }),
  });

  const quizzes = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Bank</h1>
        <p className="text-gray-500">5,000+ practice quizzes and mock tests for all competitive exams</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="input pl-10" />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className="input w-auto min-w-[160px]">
          <option value="">All Types</option>
          <option value="TOPIC_QUIZ">Topic Quiz</option>
          <option value="SUBJECT_QUIZ">Subject Quiz</option>
          <option value="MOCK_TEST">Mock Test</option>
          <option value="DAILY_QUIZ">Daily Quiz</option>
          <option value="WEEKLY_QUIZ">Weekly Quiz</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <QuizSkeleton key={i} />)
          : quizzes.length > 0
            ? quizzes.map((quiz, i) => <QuizCard key={quiz.id} quiz={quiz} index={i} />)
            : (
              <div className="col-span-3 text-center py-20 text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No quizzes found.</p>
              </div>
            )
        }
      </div>
    </div>
  );
}
