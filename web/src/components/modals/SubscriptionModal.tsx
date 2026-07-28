import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import type { SubscriptionPlan } from '../../types';

const ALL_FEATURES: Record<string, string> = {
  'access_all_pdfs': 'Unlimited PDF Access',
  'download_pdfs': 'PDF Downloads (Offline)',
  'access_all_quizzes': 'Unlimited Quizzes',
  'mock_tests': 'Mock Tests & Timed Tests',
  'question_bank': 'Full Question Bank',
  'access_all_exams': 'All Exam Packs',
  'detailed_solutions': 'Detailed Solutions',
  'video_explanations': 'Video Explanations',
  'mentorship_session': '1-on-1 Mentorship',
  'analytics_dashboard': 'Personal Analytics',
  'all_india_rank': 'All India Rank Engine',
  'priority_support': 'Priority Support',
  'coupon_eligible': 'Coupon Code Eligible',
  'early_access': 'Early Access',
};

export default function SubscriptionModal() {
  const navigate = useNavigate();
  const { subscriptionModalOpen, closeSubscriptionModal, subscriptionModalContext } = useUIStore();

  const { data } = useQuery({
    queryKey: ['plans-modal'],
    queryFn: () => apiGet<SubscriptionPlan[]>('/subscriptions/plans'),
    enabled: subscriptionModalOpen,
  });

  const topPlans = (data?.data || []).filter(p => p.isFeatured || p.duration === 'THREE_MONTHS').slice(0, 2);

  return (
    <AnimatePresence>
      {subscriptionModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeSubscriptionModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 text-white relative">
              <button
                onClick={closeSubscriptionModal}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Premium Content</h2>
                  <p className="text-primary-200 text-sm">Unlock unlimited access</p>
                </div>
              </div>

              <p className="text-primary-100 text-sm">
                {subscriptionModalContext?.message || "You've reached the free preview limit. Subscribe to unlock full content."}
              </p>
            </div>

            {/* Plans preview */}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Choose a plan:</h3>

              <div className="space-y-3 mb-5">
                {topPlans.map(plan => (
                  <div 
                    key={plan.id} 
                    onClick={() => {
                      closeSubscriptionModal();
                      navigate(`/checkout/${plan.id}`);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${plan.isFeatured ? 'border-primary-500 bg-primary-50 hover:bg-primary-100/60' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-gray-400">{(plan.features as string[]).map(f => ALL_FEATURES[f] || f).join(' · ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{plan.discountedPrice}</p>
                      <p className="text-xs text-gray-400 line-through">₹{plan.originalPrice}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {['Unlimited PDF access', 'All practice quizzes & mock tests', 'Detailed analytics & rankings', '7-day money-back guarantee'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/subscriptions"
                onClick={closeSubscriptionModal}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                <Zap className="w-5 h-5" /> View All Plans
              </Link>

              <button onClick={closeSubscriptionModal} className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3">
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
