import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Trophy, Target, ArrowRight, RotateCcw } from 'lucide-react';
import { apiGet } from '../lib/api';

interface AttemptResult {
  attempt: { id: string; correct: number; incorrect: number; skipped: number; marksObtained: number; totalMarks: number; percentage: number; timeTakenSeconds: number };
  result: { correct: number; incorrect: number; skipped: number; marksObtained: number; totalMarks: number; percentage: string; passed: boolean };
  responses: Array<{ id: string; questionId: string; isCorrect: boolean; marksObtained: number; question: { questionText: string; options: Array<{ id: string; optionText: string; isCorrect: boolean }> }; selectedOptionId: string | null; selectedOptions: string[] }>;
}

export default function QuizResultPage() {
  const { slug, attemptId } = useParams<{ slug: string; attemptId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['quiz-result', attemptId],
    queryFn: () => apiGet<AttemptResult>(`/quizzes/attempts/${attemptId}/result`),
    enabled: !!attemptId,
  });

  const result = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Result not found</p>
          <Link to="/quizzes" className="btn-primary">Browse Quizzes</Link>
        </div>
      </div>
    );
  }

  const { attempt } = result;
  const passed = attempt.marksObtained >= attempt.totalMarks * 0.35;
  const percentage = attempt.percentage;

  const formatTime = (s?: number) => {
    if (!s) return 'N/A';
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Result header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl p-8 md:p-12 text-center text-white mb-8 ${passed ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-rose-500 to-rose-700'}`}
      >
        <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
        <h1 className="text-3xl font-extrabold mb-2">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h1>
        <p className="text-white/80 text-lg mb-6">{passed ? 'You passed the quiz!' : "Don't give up! Practice makes perfect."}</p>

        <div className="text-6xl font-extrabold mb-2">{percentage.toFixed(1)}%</div>
        <div className="text-white/80">Score: {attempt.marksObtained} / {attempt.totalMarks}</div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Correct', value: attempt.correct, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Wrong', value: attempt.incorrect, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Skipped', value: attempt.skipped, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Time Taken', value: formatTime(attempt.timeTakenSeconds), icon: Clock, color: 'text-primary-600', bg: 'bg-primary-50' },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-5 text-center"
          >
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <Link to={`/quiz/${slug}`} className="btn-secondary flex-1 justify-center">
          <RotateCcw className="w-4 h-4" /> Retry Quiz
        </Link>
        <Link to="/quizzes" className="btn-primary flex-1 justify-center">
          More Quizzes <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Detailed review */}
      {result.responses && result.responses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Review</h2>
          <div className="space-y-4">
            {result.responses.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`card p-5 border-l-4 ${r.isCorrect ? 'border-l-emerald-500' : r.selectedOptions.length ? 'border-l-rose-500' : 'border-l-gray-300'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-medium text-gray-900 text-sm">Q{i + 1}. {r.question.questionText}</p>
                  <span className={`badge shrink-0 ${r.isCorrect ? 'badge-success' : r.selectedOptions.length ? 'badge-danger' : 'badge-gray'}`}>
                    {r.isCorrect ? `+${r.marksObtained}` : r.selectedOptions.length ? r.marksObtained : 'Skipped'}
                  </span>
                </div>

                <div className="space-y-1.5 ml-3">
                  {r.question.options.map(opt => {
                    const userSelected = r.selectedOptions.includes(opt.id);
                    const isCorrectOpt = opt.isCorrect;
                    return (
                      <div
                        key={opt.id}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${isCorrectOpt ? 'bg-emerald-50 text-emerald-700 font-medium' : userSelected ? 'bg-rose-50 text-rose-700' : 'text-gray-600'}`}
                      >
                        {isCorrectOpt && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                        {!isCorrectOpt && userSelected && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                        {opt.optionText}
                        {userSelected && !isCorrectOpt && <span className="ml-auto text-xs">(your answer)</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
