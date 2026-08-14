import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost } from '../../lib/api';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(d => d.email || d.mobile, {
  message: 'Email or mobile number is required',
  path: ['email'],
});

type FormData = z.infer<typeof schema>;

const passwordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');
  const strength = passwordStrength(password || '');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await apiPost('/auth/register', {
        name: data.name,
        email: data.email || undefined,
        mobile: data.mobile || undefined,
        password: data.password,
      });
      toast.success('Account created! Please verify your email.');
      // Navigate to login preserving any redirect param
      navigate(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColors = ['bg-gray-200', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-8 shadow-xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm">Join 2,50,000+ students. Start free.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Full Name</label>
          <input {...register('name')} placeholder="Your full name" className={`input ${errors.name ? 'input-error' : ''}`} />
          {errors.name && <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" placeholder="your@email.com" className={`input ${errors.email ? 'input-error' : ''}`} />
            {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Mobile</label>
            <input {...register('mobile')} placeholder="10-digit number" className={`input ${errors.mobile ? 'input-error' : ''}`} />
            {errors.mobile && <p className="mt-1.5 text-xs text-rose-600">{errors.mobile.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= strength ? strengthColors[strength] : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{strengthLabels[strength]}</p>
            </div>
          )}
          {errors.password && <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <input {...register('confirmPassword')} type="password" placeholder="Repeat password" className={`input ${errors.confirmPassword ? 'input-error' : ''}`} />
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.confirmPassword.message}</p>}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
          {[
            { ok: password.length >= 8, text: 'At least 8 characters' },
            { ok: /[A-Z]/.test(password), text: 'One uppercase letter' },
            { ok: /[0-9]/.test(password), text: 'One number' },
          ].map(({ ok, text }) => (
            <div key={text} className={`flex items-center gap-2 ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-3.5 h-3.5" /> {text}
            </div>
          ))}
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          By registering, you agree to our <a href="#" className="text-primary-600">Terms</a> and <a href="#" className="text-primary-600">Privacy Policy</a>.
        </p>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account? <Link to={redirectTo !== '/dashboard' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'} className="text-primary-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </motion.div>
  );
}
