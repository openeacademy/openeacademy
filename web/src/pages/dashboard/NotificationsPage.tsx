import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<any[]>('/notifications'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiPatch('/notifications/mark-all-read', {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.data || [];

  return (
    <div className="max-w-5xl w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <button onClick={() => markAllMutation.mutate()} className="btn-ghost text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
              className={`card p-4 flex items-start gap-3 cursor-pointer transition-colors ${!n.isRead ? 'bg-primary-50 border-primary-100' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? 'bg-primary-500' : 'bg-gray-200'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.notification.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.notification.message}</p>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy · HH:mm')}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No notifications yet</p>
        </div>
      )}
    </div>
  );
}
