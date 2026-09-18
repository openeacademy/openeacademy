import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiPost } from '../../lib/api';
import { ShieldAlert, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccountDeletionPage() {
  const [form, setForm] = useState({ identifier: '', reason: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiPost('/auth/delete-request', data),
    onSuccess: () => {
      setIsSubmitted(true);
      setError('');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to submit request. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.reason.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Account Deletion
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Submit a request to permanently delete your account and data.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Request Submitted</h3>
              <p className="text-gray-500 text-sm">
                We have received your account deletion request. Our team will process it within 7-14 business days. You may be contacted for verification.
              </p>
              <div className="pt-4">
                <Link to="/" className="text-primary-600 hover:text-primary-500 font-medium inline-flex items-center transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                  Registered Email or Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    required
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                    placeholder="Enter email or mobile number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason for Deletion <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <textarea
                    id="reason"
                    name="reason"
                    required
                    rows={4}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm resize-none transition-all"
                    placeholder="Please let us know why you are leaving..."
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>Warning:</strong> Account deletion is permanent. Once processed, you will lose access to all your purchases, exam results, and active subscriptions. This action cannot be undone.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {mutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Submit Deletion Request'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
