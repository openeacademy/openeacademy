import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, FileText, Lock, Eye, Download, Tag } from 'lucide-react';
import { apiGet, resolvePublicUrl } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import type { PDF } from '../types';
import toast from 'react-hot-toast';

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PDFCard({ pdf, index }: { pdf: PDF; index: number }) {
  const { isAuthenticated } = useAuthStore();
  const { openSubscriptionModal } = useUIStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card overflow-hidden group hover:-translate-y-1 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary-50 to-blue-50 overflow-hidden">
        {pdf.thumbnailUrl ? (
          <img 
            src={resolvePublicUrl(pdf.thumbnailUrl)} 
            alt={pdf.title} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              // Fallback if image load fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-primary-200" />
          </div>
        )}
        {pdf.requiresSubscription && (
          <div className="absolute top-2 right-2">
            <span className="badge badge-warning text-xs">
              <Lock className="w-3 h-3" /> Premium
            </span>
          </div>
        )}
        {pdf.isFeatured && (
          <div className="absolute top-2 left-2">
            <span className="badge badge-primary">Featured</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">{pdf.title}</h3>

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          {pdf.totalPages && <span>{pdf.totalPages} pages</span>}
          {pdf.fileSize && <><span>·</span><span>{formatBytes(pdf.fileSize)}</span></>}
          <span>·</span>
          <span className={`capitalize ${pdf.language === 'HINDI' ? 'text-amber-600' : 'text-gray-400'}`}>{pdf.language?.toLowerCase()}</span>
        </div>

        {pdf.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {pdf.tags.slice(0, 3).map(tag => (
              <span key={tag} className="badge badge-gray text-xs">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link to={`/read/${pdf.slug}`} className="btn-primary flex-1 justify-center text-xs py-2">
              <Eye className="w-3.5 h-3.5" />
              {pdf.requiresSubscription ? `Preview (${pdf.freePreviewPages} pages)` : 'Read'}
            </Link>
          ) : (
            <button
              onClick={() => openSubscriptionModal({ pdfId: pdf.id })}
              className="btn-secondary flex-1 justify-center text-xs py-2"
            >
              <Lock className="w-3.5 h-3.5" /> Login to Read
            </button>
          )}
          {pdf.allowDownload && isAuthenticated && (
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  toast.loading('Preparing download...', { id: 'pdf_dl' });
                  const res = await apiGet<{ downloadUrl: string; filename: string }>(`/pdfs/${pdf.id}/download`);
                  toast.dismiss('pdf_dl');
                  if (res.data?.downloadUrl) {
                    const link = document.createElement('a');
                    link.href = res.data.downloadUrl;
                    link.download = res.data.filename || `${pdf.title}.pdf`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success('Download started!');
                  }
                } catch (err: any) {
                  toast.dismiss('pdf_dl');
                  if (err?.response?.status === 402) {
                    openSubscriptionModal({ pdfId: pdf.id, message: 'Subscribe to download this PDF for offline study.' });
                  } else {
                    toast.error('Download requires active subscription');
                  }
                }
              }}
              className="btn-ghost p-2 rounded-lg hover:bg-primary-50 text-gray-600 hover:text-primary-600 transition-colors" 
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PDFSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-40" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function PDFLibraryPage() {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pdfs', { search, language }],
    queryFn: () => apiGet<PDF[]>('/pdfs', { search: search || undefined, language: language || undefined, limit: '24' }),
  });

  const pdfs = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Library</h1>
        <p className="text-gray-500">15,000+ study materials for all competitive exams</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PDFs..." className="input pl-10" />
        </div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="input w-auto min-w-[140px]"
        >
          <option value="">All Languages</option>
          <option value="ENGLISH">English</option>
          <option value="HINDI">Hindi</option>
          <option value="BILINGUAL">Bilingual</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <PDFSkeleton key={i} />)
          : pdfs.length > 0
            ? pdfs.map((pdf, i) => <PDFCard key={pdf.id} pdf={pdf} index={i} />)
            : (
              <div className="col-span-4 text-center py-20 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No PDFs found.</p>
              </div>
            )
        }
      </div>
    </div>
  );
}
