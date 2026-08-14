import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, CheckCircle, Tag, ArrowLeft, CreditCard, Lock, Zap, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { SubscriptionPlan } from '../types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const durationLabel: Record<string, string> = {
  ONE_MONTH: '1 Month Access',
  THREE_MONTHS: '3 Months Access',
  SIX_MONTHS: '6 Months Access',
  TWELVE_MONTHS: '1 Year Access',
  LIFETIME: 'Lifetime Unlimited Access',
};

const ALL_FEATURES: Record<string, string> = {
  access_all_pdfs: 'Unlimited PDF Study Notes Access',
  download_pdfs: 'Offline PDF Downloads',
  access_all_quizzes: 'Unlimited Quiz & Practice Tests',
  mock_tests: 'Full-Length Timed Mock Tests',
  question_bank: 'Complete Question Bank',
  access_all_exams: 'Access to All Exam Courses',
  detailed_solutions: 'Detailed Explanations & Solutions',
  video_explanations: 'Video Walkthroughs & Explanations',
  mentorship_session: '1-on-1 Personal Mentorship Session',
  analytics_dashboard: 'Performance Analytics & Insights',
  all_india_rank: 'All India Rank Engine',
  priority_support: '24/7 Priority Support',
};

export default function CheckoutPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<SubscriptionPlan[]>('/subscriptions/plans'),
  });

  const plan = plansData?.data?.find(p => p.id === planId);

  // Validate coupon mutation
  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !planId) return;
    setCouponError('');
    setIsValidatingCoupon(true);
    try {
      const res = await apiPost<any>('/subscriptions/validate-coupon', {
        code: couponInput.trim(),
        planId,
      });
      setAppliedCoupon(res.data);
      toast.success(`Coupon ${res.data.code} applied! Saved ₹${res.data.discountAmount}`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    toast.success('Coupon removed');
  };

  // Payment order mutation
  const createOrderMutation = useMutation({
    mutationFn: () =>
      apiPost<any>('/subscriptions/create-order', {
        planId,
        couponCode: appliedCoupon?.code || undefined,
      }),
    onSuccess: (data) => {
      const { orderId, amount, keyId, paymentId } = data.data;

      const options = {
        key: keyId || 'rzp_test_demo',
        amount,
        currency: 'INR',
        name: 'Open E Academy',
        description: `${plan?.name || 'Subscription'} Purchase`,
        order_id: orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: { color: '#2563EB' },
        handler: async (response: any) => {
          try {
            toast.loading('Verifying payment...', { id: 'rzp_verify' });
            await apiPost('/subscriptions/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId,
            });
            toast.dismiss('rzp_verify');
            toast.success('🎉 Subscription active! All plan features unlocked!');
            navigate('/dashboard');
          } catch {
            toast.dismiss('rzp_verify');
            toast.error('Payment verification failed. Please contact support.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to initialize payment');
    },
  });

  const handleProceedPayment = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to complete your purchase');
      navigate('/login');
      return;
    }
    
    // Load script on demand
    const isLoaded = await loadRazorpay();
    if (!isLoaded) {
      toast.error('Razorpay payment gateway failed to load. Please check your connection or disable adblockers.');
      return;
    }
    
    createOrderMutation.mutate();
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Plan Not Found</h2>
        <p className="text-gray-500 mb-6">The plan you selected does not exist or has expired.</p>
        <Link to="/subscriptions" className="btn-primary">
          View All Plans
        </Link>
      </div>
    );
  }

  // Price calculations
  const basePrice = plan.discountedPrice;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const priceAfterDiscount = Math.max(0, basePrice - discountAmount);
  const gstAmount = (priceAfterDiscount * plan.gstPercent) / 100;
  const finalTotal = priceAfterDiscount + gstAmount;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => navigate('/subscriptions')}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Subscription Plans
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Plan Info & Features */}
          <div className="lg:col-span-7 space-y-6">
            {/* Plan Header Card */}
            <div className="card p-6 border-l-4 border-l-primary-600 relative overflow-hidden bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge badge-primary text-xs mb-2">Selected Plan</span>
                  <h1 className="text-2xl font-black text-gray-900">{plan.name}</h1>
                  <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {durationLabel[plan.duration] || plan.duration}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-gray-900">₹{plan.discountedPrice}</span>
                  {plan.originalPrice > plan.discountedPrice && (
                    <p className="text-xs text-gray-400 line-through">₹{plan.originalPrice}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Included Features List */}
            <div className="card p-6 bg-white shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Features Included in This Plan
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                These features will be automatically activated on your account immediately upon payment verification:
              </p>
              <ul className="grid grid-cols-1 gap-3">
                {(plan.features as string[]).map((featureKey) => (
                  <li key={featureKey} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 text-sm font-medium text-emerald-950 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                    <span>{ALL_FEATURES[featureKey] || featureKey}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Checkout Summary & Coupon */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 bg-white shadow-lg border border-gray-200/80 rounded-2xl sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <CreditCard className="w-5 h-5 text-primary-600" />
                Order Summary
              </h2>

              {/* Coupon Section */}
              <div className="mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary-600" />
                  Have a Promo / Coupon Code?
                </label>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-xs font-bold text-emerald-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{appliedCoupon.code} (−₹{discountAmount})</span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-rose-600 hover:underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="input text-xs uppercase font-mono py-2 flex-1"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      className="btn-primary text-xs py-2 px-3 shrink-0"
                    >
                      {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-xs text-rose-600 mt-1 font-medium">{couponError}</p>}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2.5 text-sm mb-6 border-b border-gray-100 pb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Base Plan Price</span>
                  <span className="font-semibold text-gray-900">₹{basePrice}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>− ₹{discountAmount.toFixed(0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>GST ({plan.gstPercent}%)</span>
                  <span className="font-semibold text-gray-900">₹{gstAmount.toFixed(0)}</span>
                </div>

                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-xl text-primary-600">₹{finalTotal.toFixed(0)}</span>
                </div>
              </div>

              {/* User Pre-filled Info */}
              {user && (
                <div className="mb-6 text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p><span className="font-bold text-gray-700">Subscriber:</span> {user.name}</p>
                  <p><span className="font-bold text-gray-700">Email:</span> {user.email || 'N/A'}</p>
                  <p><span className="font-bold text-gray-700">Mobile:</span> {user.mobile || 'N/A'}</p>
                </div>
              )}

              {/* Razorpay Checkout Button */}
              <button
                onClick={handleProceedPayment}
                disabled={createOrderMutation.isPending}
                className="btn-primary w-full justify-center py-3.5 text-base font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all flex items-center gap-2"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₹{finalTotal.toFixed(0)} with Razorpay
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 text-center">
                <Shield className="w-4 h-4 text-emerald-500" /> 100% Encrypted & Secure Payment via Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>

      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
