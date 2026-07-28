import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { format } from 'date-fns';

const statusBadge = (status: string) => {
  const map: Record<string, string> = { COMPLETED: 'badge-success', PENDING: 'badge-warning', FAILED: 'badge-danger', REFUNDED: 'badge-gray' };
  return map[status] || 'badge-gray';
};

export default function PaymentHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => apiGet<any[]>('/subscriptions/payments'),
  });

  const payments = data?.data || [];

  return (
    <div className="max-w-6xl w-full space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : payments.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Invoice</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{p.invoiceNumber || p.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-gray-900">₹{p.finalAmount?.toFixed(0)}</td>
                  <td className="px-5 py-4"><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                  <td className="px-5 py-4 text-sm text-gray-500">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-16 text-center text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No payment history yet</p>
        </div>
      )}
    </div>
  );
}
