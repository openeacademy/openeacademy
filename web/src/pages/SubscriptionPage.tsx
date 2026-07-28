import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Zap, Shield, Clock, Loader2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { SubscriptionPlan } from '../types';

declare global { interface Window { Razorpay: any; } }

const durationLabel: Record<string, string> = {
  ONE_MONTH: '1 Month', THREE_MONTHS: '3 Months', SIX_MONTHS: '6 Months',
  TWELVE_MONTHS: '1 Year', LIFETIME: 'Lifetime',
};

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

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<SubscriptionPlan[]>('/subscriptions/plans'),
  });

  const { data: mySubsData } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () => apiGet<any[]>('/subscriptions/my'),
    enabled: isAuthenticated,
  });

  const plans = data?.data || [];
  const mySubs = mySubsData?.data || [];
  const activeSub = mySubs.find((s: any) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date());


  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to subscribe');
      navigate('/login');
      return;
    }
    navigate(`/checkout/${planId}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Simple, Transparent Pricing</h1>
        <p className="text-gray-500 text-lg">No hidden fees · Cancel anytime · 7-day money back guarantee</p>

        {/* Active Subscription Banner */}
        {activeSub && (
          <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 max-w-xl mx-auto text-left shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active Plan</p>
                <h4 className="text-base font-bold text-gray-900">{activeSub.plan?.name || 'Pro Membership'}</h4>
                <p className="text-xs text-gray-500">Valid until {new Date(activeSub.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <span className="badge badge-success text-xs font-bold px-3 py-1">Active</span>
          </div>
        )}
      </div>

      {/* Plans */}
      {isLoading ? (
        <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-600">No subscription plans available yet</p>
          <p className="text-sm mt-1">Please check back soon or contact support.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const gstAmount = (plan.discountedPrice * plan.gstPercent) / 100;
            const totalAmount = plan.discountedPrice + gstAmount;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 flex flex-col ${plan.isFeatured ? 'border-2 border-primary-500 shadow-premium scale-105' : 'card'}`}
              >
                {plan.isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{durationLabel[plan.duration]}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-gray-900">₹{plan.discountedPrice}</span>
                    <span className="text-gray-400 line-through">₹{plan.originalPrice}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">+ ₹{gstAmount.toFixed(0)} GST = ₹{totalAmount.toFixed(0)} total</p>
                  {plan.originalPrice > plan.discountedPrice && (
                    <span className="badge badge-success text-xs mt-1">
                      Save {Math.round((1 - plan.discountedPrice / plan.originalPrice) * 100)}%
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {(plan.features as string[]).map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {ALL_FEATURES[f] || f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${plan.isFeatured ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  <Zap className="w-4 h-4" />
                  {isAuthenticated ? 'Proceed to Checkout' : 'Login to Subscribe'}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trust signals */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: 'Secure Payments', desc: 'All transactions are encrypted & processed by Razorpay' },
          { icon: Clock, title: '7-Day Money Back', desc: 'Not satisfied? Get a full refund within 7 days, no questions asked' },
          { icon: CheckCircle, title: 'Instant Access', desc: 'Get access to all content immediately after payment' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 p-5 rounded-2xl bg-gray-50">
            <Icon className="w-6 h-6 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Compare Plan Features</h2>
          <p className="text-gray-500 text-sm">Detailed feature breakdown of what each tier unlocks</p>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-bold text-gray-600">
                <th className="py-4 px-6">Feature</th>
                <th className="py-4 px-6 text-center">Free Tier</th>
                <th className="py-4 px-6 text-center">Pro Membership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {[
                { name: 'Study Note Access', free: '3 Pages Preview', pro: 'Unlimited Full Access' },
                { name: 'Offline PDF Downloads', free: '❌ Disabled', pro: '✅ Enabled (Unlimited)' },
                { name: 'Practice Quizzes', free: 'Basic Quizzes', pro: 'All Topic & Subject Quizzes' },
                { name: 'Full Mock Tests', free: '❌ Disabled', pro: '✅ Full Timed Mock Tests' },
                { name: 'Detailed Answer Explanations', free: 'Basic Answers', pro: 'Step-by-Step Solutions' },
                { name: 'Performance Analytics & Rank', free: '❌ Disabled', pro: '✅ All India Rank Engine' },
                { name: 'Support', free: 'Standard', pro: '24/7 Priority Support' },
              ].map((row, idx) => (
                <tr key={row.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="py-3.5 px-6 font-semibold text-gray-900">{row.name}</td>
                  <td className="py-3.5 px-6 text-center text-gray-500">{row.free}</td>
                  <td className="py-3.5 px-6 text-center font-bold text-primary-600">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
