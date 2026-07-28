import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Users, ChevronRight, FileText, ArrowLeft, CheckCircle, HelpCircle, Eye, Play, Sparkles, Clock, Layers } from 'lucide-react';
import { apiGet, resolvePublicUrl } from '../lib/api';
import type { Exam } from '../types';

export default function ExamDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeTab, setActiveTab] = useState<'subjects' | 'notes' | 'quizzes'>('subjects');

  const { data, isLoading } = useQuery({
    queryKey: ['exam', slug],
    queryFn: () => apiGet<Exam>(`/exams/${slug}`),
    enabled: !!slug,
  });

  const exam = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-48 w-full rounded-2xl mb-8" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">Exam not found.</p>
        <Link to="/exams" className="btn-primary mt-4">Browse Exams</Link>
      </div>
    );
  }

  const pdfs = (exam as any)?.pdfs || [];
  const quizzes = (exam as any)?.quizzes || [];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link to="/exams" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Exams
        </Link>
      </div>

      {/* Exam hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-md"
        style={{ backgroundColor: exam.color || '#2563EB' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 border border-white/20">
              {exam.icon ? (
                <img src={exam.icon} alt="" className="w-9 h-9 object-contain" />
              ) : (
                exam.name[0]
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{exam.name}</h1>
              {exam.description && <p className="text-white/85 text-xs md:text-sm mt-1 line-clamp-2">{exam.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/15 min-w-[72px]">
              <div className="text-base font-extrabold">{exam._count?.subjects || 0}</div>
              <div className="text-[10px] text-white/80 font-medium">Subjects</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/15 min-w-[72px]">
              <div className="text-base font-extrabold">{exam._count?.pdfs || pdfs.length}</div>
              <div className="text-[10px] text-white/80 font-medium">PDFs</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl text-center border border-white/15 min-w-[72px]">
              <div className="text-base font-extrabold">{exam._count?.quizzes || quizzes.length}</div>
              <div className="text-[10px] text-white/80 font-medium">Tests</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subjects'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Subjects ({exam.subjects?.length || 0})
        </button>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* TAB 1: SUBJECTS */}
          {activeTab === 'subjects' && (
            <div className="space-y-3">
              {exam.subjects?.map((subject, i) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/exams/${exam.slug}/subjects/${subject.id}`}
                    className="card p-4 flex items-center gap-3.5 group hover:border-primary-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary-600 transition-colors">
                      {subject.icon ? (
                        <img src={subject.icon} alt="" className="w-6 h-6 object-contain" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary-600 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-primary-600 transition-colors truncate">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {subject._count?.pdfs || 0} PDFs · {subject._count?.quizzes || 0} Quizzes
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* TAB 2: STUDY NOTES / PDFS */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {pdfs.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 bg-white">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-700">No Study Notes Found for {exam.name}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="flex items-start gap-3.5 mb-3">
                          <div className="w-10 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-5 h-5 text-rose-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="badge badge-primary text-[10px] mb-1">
                              {!pdf.requiresSubscription ? 'Free Note' : 'Pro Note'}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm line-clamp-2">
                              {pdf.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                          <span className="text-xs text-gray-400">{pdf.totalPages || 1} Pages</span>
                          <Link
                            to={`/read/${pdf.slug}`}
                            className="btn-primary text-xs py-1.5 px-3 rounded-xl font-semibold flex items-center gap-1.5"
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

          {/* TAB 3: PRACTICE QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="space-y-3">
              {quizzes.length === 0 ? (
                <div className="card p-12 text-center text-gray-400 bg-white">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700">No Quizzes Found for {exam.name}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map((quiz: any, idx: number) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card p-4 bg-white border border-gray-200/80 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="badge badge-warning text-[10px] mb-1">
                            {quiz.durationMinutes} Mins · {quiz._count?.quizQuestions || quiz.totalQuestions || 0} Qs
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-2">
                            {quiz.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                        <Link
                          to={`/quiz/${quiz.slug}`}
                          className="btn-primary text-xs py-1.5 px-3.5 rounded-xl font-semibold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white border-none"
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

          {/* FAQs */}
          {exam.faqs && exam.faqs.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-base font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
              <div className="space-y-2.5">
                {exam.faqs.map(faq => (
                  <div key={faq.id} className="card p-4 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" /> {faq.question}
                    </h3>
                    <p className="text-xs text-gray-600 ml-6 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sticky top-20">
          {/* Subscription Card */}
          <div className="card p-5 bg-gradient-to-br from-white to-primary-50/30 border border-gray-200/80 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Subscription Plans
            </h3>

            {exam.plans && exam.plans.length > 0 ? (
              <div className="space-y-3">
                {exam.plans.map(plan => (
                  <div key={plan.id} className={`rounded-xl p-3.5 border ${plan.isFeatured ? 'border-primary-500 bg-primary-50/60' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-xs">{plan.name}</h4>
                      <span className="text-xs font-black text-primary-600">₹{plan.discountedPrice}</span>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {(plan.features || []).slice(0, 3).map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link to={`/checkout/${plan.id}`} className="btn-primary text-xs py-1.5 w-full justify-center">
                      Subscribe Now
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 mb-3">Unlock all PDFs, Topic Quizzes & Timed Mock Tests for {exam.name}.</p>
                <Link to="/subscriptions" className="btn-primary text-xs py-2 w-full justify-center font-semibold">
                  View All Plans & Pricing
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
