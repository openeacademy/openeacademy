import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Bookmark, SkipForward } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import type { Quiz, QuizQuestion } from '../types';
import toast from 'react-hot-toast';
import { useUIStore } from '../stores/uiStore';

interface AttemptData {
  attemptId: string;
  quiz: { id: string; title: string; durationMinutes: number; negativeMarking: boolean; negativeMarkValue: number };
  questions: QuizQuestion[];
}

export default function QuizPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const { openSubscriptionModal } = useUIStore();

  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [qStartTime, setQStartTime] = useState(Date.now());

  // Start attempt
  const startMutation = useMutation({
    mutationFn: (quizId: string) => apiPost<AttemptData>(`/quizzes/${quizId}/start`, {}),
    onSuccess: (data) => {
      setAttemptData(data.data);
      setTimeLeft(data.data.quiz.durationMinutes * 60);
    },
    onError: (err: any) => {
      if (err?.response?.status === 402) {
        openSubscriptionModal({ message: 'This quiz is part of a premium plan. Subscribe to unlock unlimited attempts.' });
        navigate(-1);
      } else {
        toast.error('Failed to start quiz');
      }
    },
  });

  // Get quiz metadata first to get ID
  const { data: quizData } = useQuery({
    queryKey: ['quiz', slug],
    queryFn: () => apiGet<Quiz>(`/quizzes/${slug}`),
    enabled: !!slug,
  });

  useEffect(() => {
    if (quizData?.data && !attemptData) {
      startMutation.mutate(quizData.data.id);
    }
  }, [quizData]);

  // Timer
  useEffect(() => {
    if (!attemptData || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attemptData]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const selectOption = (questionId: string, optionId: string, isMultiple = false) => {
    setAnswers(prev => {
      if (isMultiple) {
        const curr = prev[questionId] || [];
        const updated = curr.includes(optionId) ? curr.filter(id => id !== optionId) : [...curr, optionId];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const navigateQuestion = (index: number) => {
    // Save time spent on current question
    const qId = attemptData?.questions[currentQ]?.id;
    if (qId) {
      setQuestionTimes(prev => ({ ...prev, [qId]: (prev[qId] || 0) + Math.round((Date.now() - qStartTime) / 1000) }));
    }
    setQStartTime(Date.now());
    setCurrentQ(index);
  };

  const handleSubmit = async () => {
    if (isSubmitting || !attemptData) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);

    const responses = attemptData.questions.map(q => ({
      questionId: q.id,
      selectedOptionId: answers[q.id]?.[0] || null,
      selectedOptions: answers[q.id] || [],
      isSkipped: !answers[q.id]?.length,
      markedForReview: markedForReview.has(q.id),
      timeTakenSeconds: questionTimes[q.id] || 0,
    }));

    try {
      await apiPost(`/quizzes/attempts/${attemptData.attemptId}/submit`, {
        responses,
        timeTakenSeconds: attemptData.quiz.durationMinutes * 60 - timeLeft,
      });
      navigate(`/quiz/${slug}/result/${attemptData.attemptId}`);
    } catch {
      toast.error('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (startMutation.isPending || !attemptData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Preparing your quiz...</p>
        </div>
      </div>
    );
  }

  const questions = attemptData.questions;
  const question = questions[currentQ];
  const isMultipleChoice = question?.type === 'MULTIPLE_CORRECT';
  const selectedOptions = answers[question?.id] || [];
  const timePercent = (timeLeft / (attemptData.quiz.durationMinutes * 60)) * 100;
  const isLowTime = timeLeft < 120;

  const questionStatus = (q: QuizQuestion) => {
    if (markedForReview.has(q.id)) return 'review';
    if (answers[q.id]?.length) return 'answered';
    return 'unanswered';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900 truncate">{attemptData.quiz.title}</h1>
          <p className="text-xs text-gray-500">{questions.length} questions · {attemptData.quiz.negativeMarking ? `−${attemptData.quiz.negativeMarkValue} for wrong` : 'No negative marking'}</p>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${isLowTime ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>

        <button
          onClick={() => { if (confirm('Submit quiz now?')) handleSubmit(); }}
          disabled={isSubmitting}
          className="btn-primary text-sm py-2 px-4"
        >
          Submit
        </button>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <motion.div
          className={`h-full transition-colors ${isLowTime ? 'bg-rose-500' : 'bg-primary-600'}`}
          animate={{ width: `${timePercent}%` }}
        />
      </div>

      <div className="max-w-7xl xl:max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8 items-start">
          {/* Question panel (70% width area) */}
          <main className="lg:col-span-7 min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary">Q {currentQ + 1} / {questions.length}</span>
                  {question.categoryName && (
                    <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
                      {question.categoryName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{question.marks} marks</span>
                  <button
                    onClick={() => setMarkedForReview(s => { const n = new Set(s); n.has(question.id) ? n.delete(question.id) : n.add(question.id); return n; })}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${markedForReview.has(question.id) ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    <Flag className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-900 font-medium leading-relaxed text-base">{question.questionText}</p>
                {question.questionImage && (
                  <img src={question.questionImage} alt="Question" className="mt-4 rounded-xl max-h-48 object-contain" />
                )}
              </div>

              {isMultipleChoice && (
                <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Multiple correct answers possible. Select all that apply.
                </p>
              )}

              <div className="space-y-2.5">
                {question.options.map((option) => {
                  const isSelected = selectedOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => selectOption(question.id, option.id, isMultipleChoice)}
                      className={`option-btn ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span>{option.optionText}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigateQuestion(currentQ - 1)} disabled={currentQ === 0} className="btn-secondary py-2 px-4 text-sm">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              onClick={() => { setAnswers(prev => { const n = { ...prev }; delete n[question.id]; return n; }); }}
              className="btn-ghost text-sm text-gray-400"
            >
              <SkipForward className="w-4 h-4" /> Clear & Skip
            </button>

            <button
              onClick={() => currentQ < questions.length - 1 ? navigateQuestion(currentQ + 1) : handleSubmit()}
              className="btn-primary py-2 px-4 text-sm"
            >
              {currentQ < questions.length - 1 ? (<>Next <ChevronRight className="w-4 h-4" /></>) : 'Finish'}
            </button>
          </div>
        </main>

          {/* Question palette (30% width area) */}
          <aside className="lg:col-span-3 w-full">
            <div className="card p-5 sticky top-20 shadow-sm border border-gray-200/80 bg-white rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-pulse" />
                    Question Palette
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Quick navigation & status</p>
                </div>
                <span className="badge badge-primary text-xs font-bold px-2.5 py-1">
                  {questions.length} Qs
                </span>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
                  <span>Review</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3 h-3 rounded-md bg-gray-200 shrink-0" />
                  <span>Skipped</span>
                </div>
              </div>

              {/* Question Number Palette Grid */}
              <div className="grid grid-cols-5 xl:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                {questions.map((q, i) => {
                  const status = questionStatus(q);
                  const isCurrent = i === currentQ;
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateQuestion(i)}
                      className={`h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center border outline-none focus:outline-none focus:ring-0 ${
                        isCurrent
                          ? 'border-2 border-primary-600 shadow-md scale-105 z-10'
                          : 'hover:scale-105 border-gray-200/80'
                      } ${
                        isCurrent && status !== 'answered' && status !== 'review'
                          ? 'bg-primary-600 text-white'
                          : status === 'answered'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : status === 'review'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Quick Submit inside Palette */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => { if (confirm('Submit test now?')) handleSubmit(); }}
                  disabled={isSubmitting}
                  className="btn-primary w-full py-2.5 text-xs font-bold rounded-xl justify-center shadow-md"
                >
                  Submit Test Now
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
