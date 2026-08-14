import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost } from '../../lib/api';

type Step = 'contact' | 'otp' | 'reset' | 'done';

const OTP_RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(10);

  // Resend OTP countdown
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = () => {
    setResendCountdown(OTP_RESEND_SECONDS);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const sendOtp = async () => {
    if (!contact.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiPost<{ expiryMinutes?: number }>('/auth/forgot-password', { contact: contact.trim() });
      setExpiryMinutes(res.data?.expiryMinutes || 10);
      toast.success('OTP sent! Check your email or SMS.');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to send OTP. Please verify your email/mobile is registered.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCountdown > 0) return;
    setErrorMsg('');
    setIsLoading(true);
    try {
      await apiPost('/auth/forgot-password', { contact: contact.trim() });
      toast.success('OTP resent!');
      startCountdown();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndReset = async () => {
    if (!otp || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      await apiPost('/auth/reset-password', { contact: contact.trim(), otp, newPassword });
      setStep('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Reset failed. Check your OTP and try again.';
      setErrorMsg(msg);
      toast.error(msg);
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
              {step === 'contact'
                ? "Enter your registered email or mobile — we'll send an OTP."
                : `Enter the ${expiryMinutes}-minute OTP sent to ${contact} and set a new password.`}
            </p>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm mb-4"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="label">Email or Mobile Number</label>
                <input
                  value={contact}
                  onChange={e => { setContact(e.target.value); setErrorMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  placeholder="your@email.com or 9XXXXXXXXX"
                  className="input"
                  autoFocus
                />
              </div>
              <button onClick={sendOtp} disabled={isLoading || !contact.trim()} className="btn-primary w-full justify-center py-3">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send OTP
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              {/* OTP input */}
              <div>
                <label className="label">OTP Code</label>
                <input
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrorMsg(''); }}
                  placeholder="6-digit OTP"
                  className="input text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  OTP expires in {expiryMinutes} minutes · Sent to <span className="font-semibold text-gray-600">{contact}</span>
                </p>
              </div>

              {/* New password */}
              <div>
                <label className="label">New Password</label>
                <input
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setErrorMsg(''); }}
                  type="password"
                  placeholder="Min. 8 characters"
                  className="input"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label className="label">Confirm Password</label>
                <input
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrorMsg(''); }}
                  type="password"
                  placeholder="Re-enter new password"
                  className="input"
                />
              </div>

              <button
                onClick={verifyAndReset}
                disabled={isLoading || otp.length < 6 || !newPassword || !confirmPassword}
                className="btn-primary w-full justify-center py-3"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reset Password
              </button>

              {/* Resend OTP */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep('contact')} className="text-sm text-gray-500 hover:text-primary-600">
                  ← Change contact
                </button>
                <button
                  onClick={resendOtp}
                  disabled={resendCountdown > 0 || isLoading}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${resendCountdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
