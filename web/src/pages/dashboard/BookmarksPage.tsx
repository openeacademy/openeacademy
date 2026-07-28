import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, FileText, Trash2, ExternalLink } from 'lucide-react';
import { apiGet, apiDelete } from '../../lib/api';
import toast from 'react-hot-toast';

export default function BookmarksPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiGet<any[]>('/user/bookmarks'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/user/bookmarks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookmarks'] }); toast.success('Bookmark removed'); },
  });

  const bookmarks = data?.data || [];

  return (
    <div className="max-w-7xl w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bm: any) => (
            <div key={bm.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{bm.pdf?.title}</p>
                {bm.page && <p className="text-xs text-gray-400">Page {bm.page}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/read/${bm.pdf?.slug}`} className="btn-ghost p-2 rounded-lg">
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button onClick={() => deleteMutation.mutate(bm.id)} className="btn-ghost p-2 rounded-lg text-rose-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-16 text-center text-gray-400">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No bookmarks yet. Bookmark pages while reading PDFs!</p>
          <Link to="/pdfs" className="btn-primary mt-4">Browse PDFs</Link>
        </div>
      )}
    </div>
  );
}
