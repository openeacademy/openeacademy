import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { apiPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Shield } from 'lucide-react';

const schema = z.object({
  identifier: z.string().min(1, 'Email or mobile required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await apiPost<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', data);
      
      if (result.data.user.role !== 'ADMIN' && result.data.user.role !== 'SUPER_ADMIN') {
        toast.error('Unauthorized access');
        return;
      }
      
      login(result.data.user, result.data.accessToken, result.data.refreshToken);
      toast.success('Admin login successful');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500">Sign in to manage Open E Academy</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Admin Email or Mobile</label>
            <input {...register('identifier')} className="input" placeholder="admin@openeacademy.in" />
            {errors.identifier && <p className="text-xs text-rose-600 mt-1">{errors.identifier.message}</p>}
          </div>

          <div>
            <label className="label">Password</label>
            <input {...register('password')} type="password" className="input" placeholder="Enter password" />
            {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-2">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
