import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPost } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await apiPost<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', data);
      login(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success(`Welcome back, ${result.data.user.name}!`);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed';
      setError('identifier', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-8 shadow-xl"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm">Sign in to continue your learning journey</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Email or Mobile Number</label>
          <input
            {...register('identifier')}
            placeholder="Enter email or 10-digit mobile"
            className={`input ${errors.identifier ? 'input-error' : ''}`}
            autoComplete="username"
          />
          {errors.identifier && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.identifier.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="label !mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input {...register('rememberMe')} type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-primary-600" />
          <label htmlFor="remember" className="text-sm text-gray-600">Remember me for 30 days</label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full justify-center py-3"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don't have an account?{' '}
        <Link
          to={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : '/register'}
          className="text-primary-600 font-semibold hover:underline"
        >
          Create one free
        </Link>
      </p>
    </motion.div>
  );
}
