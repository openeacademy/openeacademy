import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiGet, apiPut, apiPost } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email().optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type FormData = z.infer<typeof schema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiPut('/user/profile', data),
    onSuccess: (res: any) => {
      updateUser(res.data);
      toast.success('Profile updated!');
      queryClient.invalidateQueries({ queryKey: ['user-dashboard'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const { register: regPwd, handleSubmit: handlePwdSubmit, formState: { errors: pwdErrors }, reset: resetPwd } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const pwdMutation = useMutation({
    mutationFn: (data: PasswordData) => apiPost('/user/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPwd();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to change password'),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => apiGet<any>('/user/dashboard'),
  });

  const activeSub = dashboardData?.data?.activeSubscription;

  return (
    <div className="max-w-4xl w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {activeSub ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white/90">Current Plan</h2>
              <p className="text-2xl font-black mt-1">{activeSub.plan.name}</p>
              <p className="text-sm text-primary-100 mt-2">
                Valid until {new Date(activeSub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <a href="/subscriptions" className="bg-white text-primary-700 px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors">
              Upgrade Plan
            </a>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 bg-gray-50 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">No Active Plan</h2>
              <p className="text-sm text-gray-500 mt-1">Upgrade to access premium features.</p>
            </div>
            <a href="/subscriptions" className="btn-primary px-5 py-2.5 text-sm">
              View Plans
            </a>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-bold text-2xl">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email || user?.mobile}</p>
            <span className="badge badge-primary text-xs mt-1">{user?.role}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register('name')} className={`input pl-10 ${errors.name ? 'input-error' : ''}`} />
            </div>
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input {...register('email')} type="email" className="input pl-10" />
            </div>
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={user?.mobile || ''} disabled className="input pl-10 bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Mobile number cannot be changed</p>
          </div>

          <button type="submit" disabled={!isDirty || updateMutation.isPending} className="btn-primary py-2.5 px-6">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Change Password</h2>
        <form onSubmit={handlePwdSubmit(d => pwdMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="label">Current Password</label>
            <input type="password" {...regPwd('currentPassword')} className={`input ${pwdErrors.currentPassword ? 'input-error' : ''}`} />
            {pwdErrors.currentPassword && <p className="text-xs text-rose-600 mt-1">{pwdErrors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" {...regPwd('newPassword')} className={`input ${pwdErrors.newPassword ? 'input-error' : ''}`} />
            {pwdErrors.newPassword && <p className="text-xs text-rose-600 mt-1">{pwdErrors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" {...regPwd('confirmPassword')} className={`input ${pwdErrors.confirmPassword ? 'input-error' : ''}`} />
            {pwdErrors.confirmPassword && <p className="text-xs text-rose-600 mt-1">{pwdErrors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={pwdMutation.isPending} className="btn-primary py-2.5 px-6">
            {pwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update Password
          </button>
        </form>
      </motion.div>
    </div>
  );
}
