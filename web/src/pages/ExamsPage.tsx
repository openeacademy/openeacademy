import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, BookOpen, ChevronRight } from 'lucide-react';
import { apiGet } from '../lib/api';
import type { Exam } from '../types';

function ExamCard({ exam, index }: { exam: Exam; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/exams/${exam.slug}`} className="card p-5 flex items-start gap-4 group hover:-translate-y-0.5 transition-all duration-200">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ backgroundColor: exam.color || '#2563EB' }}
        >
          {exam.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">{exam.name}</h3>
          {exam.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{exam.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{exam._count?.subjects || 0} Subjects</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{exam._count?.pdfs || 0} PDFs</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">{exam._count?.quizzes || 0} Tests</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 shrink-0 transition-colors" />
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className="skeleton w-12 h-12 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}

export default function ExamsPage() {
  const [search, setSearch] = useState('');
  const [featured, setFeatured] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['exams', { search, featured }],
    queryFn: () => apiGet<Exam[]>('/exams', { search: search || undefined, featured: featured ? 'true' : undefined, limit: '50' }),
  });

  const exams = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Exams</h1>
        <p className="text-gray-500">Browse 50+ government exams with comprehensive study material</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exams..."
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setFeatured(!featured)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${featured ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
        >
          <Filter className="w-4 h-4" /> Featured Only
        </button>
      </div>

      {/* Exams grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : exams.length > 0
            ? exams.map((exam, i) => <ExamCard key={exam.id} exam={exam} index={i} />)
            : (
              <div className="col-span-2 text-center py-16 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No exams found. Try a different search.</p>
              </div>
            )
        }
      </div>
    </div>
  );
}
