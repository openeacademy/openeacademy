import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Trophy, FileText, Clock, ChevronRight, Play, Eye, Sparkles, Layers } from 'lucide-react';
import { apiGet, resolvePublicUrl } from '../lib/api';
import type { Subject } from '../types';

export default function SubjectPage() {
  const { examSlug, subjectId } = useParams<{ examSlug: string; subjectId: string }>();
  const [activeTab, setActiveTab] = useState<'notes' | 'quizzes' | 'topics'>('notes');

  const { data, isLoading } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => apiGet<Subject>(`/subjects/${subjectId}`),
    enabled: !!subjectId,
  });

  const subject = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-4">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-32 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const pdfs = (subject as any)?.pdfs || [];
  const quizzes = (subject as any)?.quizzes || [];
  const topics = subject?.topics || [];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          to={`/exams/${examSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {subject?.exam?.name || 'Exam'}
        </Link>
      </div>

      {subject && (
        <>
          {/* Subject Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 bg-white border border-gray-200/80 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                {subject.icon ? (
                  <img src={subject.icon} alt="" className="w-7 h-7 object-contain" />
                ) : (
                  <BookOpen className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900">{subject.name}</h1>
                {subject.description && <p className="text-xs text-gray-500 mt-0.5">{subject.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="badge badge-primary text-[11px]">{pdfs.length} PDFs</span>
                  <span className="badge badge-warning text-[11px]">{quizzes.length} Quizzes</span>
                  <span className="badge badge-neutral text-[11px]">{topics.length} Topics</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'notes'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" /> Study Notes ({pdfs.length})
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'quizzes'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Trophy className="w-4 h-4" /> Practice Quizzes ({quizzes.length})
            </button>
            {topics.length > 0 && (
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'topics'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Layers className="w-4 h-4" /> Topics ({topics.length})
              </button>
            )}
          </div>

          {/* TAB 1: STUDY NOTES / PDFS */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {pdfs.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 bg-white">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">No Study Notes Available Yet</p>
                  <p className="text-xs text-gray-400 mt-1">Study materials for this subject will be added soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pdfs.map((pdf: any, idx: number) => {
                    const thumbUrl = resolvePublicUrl(pdf.thumbnailUrl);
                    return (
                      <motion.div
                        key={pdf.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="card p-4 bg-white border border-gray-200/80 rounded-2xl hover:border-primary-300 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3.5 mb-4">
                          <div className="w-12 h-14 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-6 h-6 text-rose-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {!pdf.requiresSubscription ? (
                                <span className="badge badge-success text-[10px] px-2 py-0.5">Free</span>
                              ) : (
                                <span className="badge badge-primary text-[10px] px-2 py-0.5 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> Pro Note
                                </span>
                              )}
                              {pdf.totalPages && (
                                <span className="text-[11px] text-gray-400 font-medium">
                                  {pdf.totalPages} Pages
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">
                              {pdf.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                          <span className="text-xs text-gray-400">
                            {pdf.fileSize ? `${(pdf.fileSize / 1024 / 1024).toFixed(1)} MB` : 'PDF Document'}
                          </span>
                          <Link
                            to={`/read/${pdf.slug}`}
                            className="btn-primary text-xs py-1.5 px-3.5 rounded-xl font-semibold flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Read Note
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRACTICE QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="space-y-4">
              {quizzes.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 bg-white">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700">No Quizzes Available Yet</p>
                  <p className="text-xs text-gray-400 mt-1">Practice quizzes for this subject will be published shortly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz: any, idx: number) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card p-4 bg-white border border-gray-200/80 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!quiz.requiresSubscription ? (
                              <span className="badge badge-success text-[10px] px-2 py-0.5">Free Quiz</span>
                            ) : (
                              <span className="badge badge-primary text-[10px] px-2 py-0.5">Pro Test</span>
                            )}
                            {quiz.difficulty && (
                              <span className="badge badge-neutral text-[10px] uppercase font-bold">
                                {quiz.difficulty}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">
                            {quiz.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 my-2 bg-gray-50 p-2 rounded-xl">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400" /> {quiz.durationMinutes} Mins
                        </span>
                        <span className="font-medium">{quiz._count?.quizQuestions || quiz.totalQuestions || 0} Questions</span>
                        <span className="font-semibold text-gray-700">{quiz.totalMarks} Marks</span>
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        <Link
                          to={`/quiz/${quiz.slug}`}
                          className="btn-primary text-xs py-1.5 px-4 rounded-xl font-semibold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 border-none text-white shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start Quiz
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TOPICS */}
          {activeTab === 'topics' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {topics.map((topic: any, idx: number) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div className="card p-3.5 bg-white text-center hover:border-primary-300 transition-colors border border-gray-200/80 rounded-xl">
                    <p className="text-xs font-bold text-gray-800 line-clamp-2">{topic.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
