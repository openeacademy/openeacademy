import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

declare global {
  interface Window {
    Razorpay: any;
    ReactNativeWebView: any;
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

export default function WebviewCheckout() {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { setTokens, user } = useAuthStore((state: any) => ({
    setTokens: state.setTokens,
    user: state.user,
  }));

  // Login via token
  useEffect(() => {
    if (token) {
      setTokens(token, '');
    }
  }, [token, setTokens]);

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<any>('/subscriptions/plans'),
  });

  const plan = plansData?.data?.find((p: any) => p.id === planId);

  const createOrderMutation = useMutation({
    mutationFn: () => apiPost<any>('/subscriptions/create-order', { planId }),
    onSuccess: async (data) => {
      const { orderId, amount, keyId, paymentId } = data.data;

      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_ERROR', error: 'Razorpay failed to load' }));
        }
        return;
      }

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
            await apiPost('/subscriptions/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId,
            });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_SUCCESS' }));
            }
          } catch (err: any) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_ERROR', error: err?.response?.data?.message || 'Verification failed' }));
            }
          }
        },
        modal: {
          ondismiss: function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_CANCELLED' }));
            }
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_ERROR', error: response.error.description }));
        }
      });
      rzp.open();
    },
    onError: (err: any) => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_ERROR', error: err?.response?.data?.message || 'Failed to initialize payment' }));
      }
    },
  });

  // Trigger order creation when plan and token are ready
  useEffect(() => {
    if (plan && token) {
      createOrderMutation.mutate();
    }
  }, [plan, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Initializing Secure Payment Gateway...</p>
        <p className="text-xs text-gray-400">Please do not close this window</p>
      </div>
    </div>
  );
}
