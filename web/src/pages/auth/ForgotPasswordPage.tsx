import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost } from '../../lib/api';

type Step = 'contact' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendOtp = async () => {
    if (!contact) return;
    setIsLoading(true);
    try {
      await apiPost('/auth/forgot-password', { contact });
      toast.success('OTP sent! Check your email/SMS.');
      setStep('otp');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndReset = async () => {
    if (!otp || !newPassword) return;
    setIsLoading(true);
    try {
      await apiPost('/auth/reset-password', { contact, otp, newPassword });
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reset failed. Check your OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8 shadow-xl">
      {step === 'done' ? (
        <div className="text-center py-6">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
          <p className="text-gray-500 text-sm mb-6">Your password has been updated successfully.</p>
          <Link to="/login" className="btn-primary">Go to Login</Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <Link to="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 'contact' ? "Enter your email or mobile and we'll send an OTP." : "Enter the OTP and set a new password."}
            </p>
          </div>

          {step === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="label">Email or Mobile Number</label>
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="your@email.com or 9XXXXXXXXX"
                  className="input"
                />
              </div>
              <button onClick={sendOtp} disabled={isLoading || !contact} className="btn-primary w-full justify-center py-3">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send OTP
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="label">OTP</label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="input text-center text-2xl tracking-widest font-bold"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="Min. 8 characters"
                  className="input"
                />
              </div>
              <button onClick={verifyAndReset} disabled={isLoading || otp.length < 6 || !newPassword} className="btn-primary w-full justify-center py-3">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Reset Password
              </button>
              <button onClick={() => setStep('contact')} className="w-full text-sm text-gray-500 hover:text-primary-600">
                ← Change contact
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
