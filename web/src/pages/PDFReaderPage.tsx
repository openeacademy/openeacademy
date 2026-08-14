import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, Maximize2, ZoomIn, ZoomOut, Moon, Sun, Bookmark, ChevronLeft, Mail, Phone, X } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import type { PDF } from '../types';
import toast from 'react-hot-toast';

interface StreamData {
  signedUrl: string;
  page: number;
  totalPages: number;
  freePreviewPages: number;
  isSubscribed: boolean;
  watermark?: string;
}

// Helper to dynamically load pdf.js script for native canvas rendering
async function getPdfjs() {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  const pdfjsLib = (window as any).pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return pdfjsLib;
}

function PDFCanvasViewer({
  url,
  pageNumber,
  zoom,
  watermark,
  isBlurred,
}: {
  url: string;
  pageNumber: number;
  zoom: number;
  watermark?: string;
  isBlurred?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let renderTask: any = null;
    let isCancelled = false;

    async function renderPage() {
      if (!url) return;
      try {
        setLoading(true);
        setError(false);
        const pdfjs = await getPdfjs();

        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();

        if (isCancelled) return;

        const pdfDoc = await pdfjs.getDocument({ data: arrayBuf }).promise;
        if (isCancelled) return;

        const targetPage = Math.max(1, Math.min(pageNumber || 1, pdfDoc.numPages));
        const page = await pdfDoc.getPage(targetPage);
        if (isCancelled) return;

        const baseScale = 1.5 * (zoom / 100);
        const viewport = page.getViewport({ scale: baseScale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
        if (!isCancelled) setLoading(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn('Canvas render error, fallback to frame:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try { renderTask.cancel(); } catch {}
      }
    };
  }, [url, pageNumber, zoom]);

  if (error) {
    return (
      <div className="relative flex justify-center items-center my-4 overflow-hidden rounded-xl shadow-2xl bg-white p-4">
        <iframe
          src={`${url}#page=${pageNumber}`}
          className={`rounded-xl shadow-2xl ${isBlurred ? 'filter blur-2xl opacity-20 select-none pointer-events-none' : ''}`}
          style={{ width: `${Math.min(900, 900 * zoom / 100)}px`, height: `${Math.min(1200, 1200 * zoom / 100)}px` }}
          title={`Page ${pageNumber}`}
        />
      </div>
    );
  }

  return (
    <div className="relative flex justify-center items-center my-4 overflow-hidden rounded-2xl shadow-2xl bg-white border border-gray-200/80 max-w-full">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 min-h-[500px]">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3" />
          <p className="text-xs text-gray-500 font-medium">Rendering document page {pageNumber}...</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`max-w-full h-auto transition-all duration-300 rounded-2xl ${
          isBlurred ? 'filter blur-2xl scale-[1.04] opacity-25 select-none pointer-events-none brightness-75' : ''
        }`}
        style={{
          width: `${Math.min(900, 900 * (zoom / 100))}px`,
        }}
      />

      {watermark && !isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-gray-400/25 text-3xl md:text-5xl font-black rotate-[-30deg] tracking-widest whitespace-nowrap">
            {watermark}
          </span>
        </div>
      )}
    </div>
  );
}

export default function PDFReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { openSubscriptionModal } = useUIStore();
  const { isAuthenticated, user } = useAuthStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [nightMode, setNightMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pageInput, setPageInput] = useState('1');
  const [lastValidStream, setLastValidStream] = useState<StreamData | null>(null);

  // Contact capture modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInput, setContactInput] = useState('');
  const [contactType, setContactType] = useState<'email' | 'mobile'>('email');
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [captureComplete, setCaptureComplete] = useState(false);

  // Check if user is authenticated; if not, redirect to login with redirect back
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/read/${slug}`)}`, { replace: true });
    }
  }, [isAuthenticated, slug, navigate]);

  // Check if contact info is needed (only for unauthenticated OR users without email/mobile)
  useEffect(() => {
    if (!isAuthenticated) return;
    const alreadyHasContact = user?.email || user?.mobile;
    const leadCaptured = localStorage.getItem(`lead_captured_${slug}`);
    if (!alreadyHasContact && !leadCaptured) {
      setShowContactModal(true);
    } else {
      setCaptureComplete(true);
    }
  }, [isAuthenticated, user, slug]);

  const handleContactSubmit = async () => {
    if (!contactInput.trim()) return;
    setCaptureSubmitting(true);
    try {
      await apiPost('/auth/capture-lead', { contact: contactInput.trim(), pdfSlug: slug });
      localStorage.setItem(`lead_captured_${slug}`, '1');
      setShowContactModal(false);
      setCaptureComplete(true);
      toast.success('Thank you! Enjoy reading.');
    } catch {
      // Even on error, allow reading
      localStorage.setItem(`lead_captured_${slug}`, '1');
      setShowContactModal(false);
      setCaptureComplete(true);
    } finally {
      setCaptureSubmitting(false);
    }
  };

  // Get PDF metadata
  const { data: pdfData } = useQuery({
    queryKey: ['pdf', slug],
    queryFn: () => apiGet<PDF>(`/pdfs/${slug}`),
  });

  // Get PDF page (signed URL)
  const { data: streamData, isLoading: pageLoading, error: pageError } = useQuery({
    queryKey: ['pdf-stream', pdfData?.data?.id, currentPage],
    queryFn: () => apiGet<StreamData>(`/pdfs/${pdfData!.data.id}/stream`, { page: currentPage }),
    enabled: !!pdfData?.data?.id,
    retry: false,
  });

  // Save progress mutation
  const saveMutation = useMutation({
    mutationFn: (page: number) => apiPatch(`/pdfs/${pdfData?.data?.id}/progress`, {
      lastPage: page,
      readingProgress: pdfData?.data?.totalPages ? (page / pdfData.data.totalPages) * 100 : 0,
    }),
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: (page: number) => apiPost('/user/bookmarks', { pdfId: pdfData?.data?.id, page }),
    onSuccess: () => toast.success('Bookmarked!'),
  });

  useEffect(() => {
    if (streamData?.data?.signedUrl) {
      setLastValidStream(streamData.data);
    }
  }, [streamData]);

  useEffect(() => {
    if ((pageError as any)?.response?.status === 402) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [pageError]);

  useEffect(() => {
    if (currentPage > 1) {
      saveMutation.mutate(currentPage);
    }
    setPageInput(String(currentPage));
  }, [currentPage]);

  const pdf = pdfData?.data;
  const stream = streamData?.data;

  const goToPage = (page: number) => {
    if (!pdf?.totalPages) return;
    const clamped = Math.max(1, Math.min(page, pdf.totalPages));
    setCurrentPage(clamped);
    setIsLocked(false);
  };

  return (
    <div className={`min-h-screen flex flex-col ${nightMode ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>

      {/* Contact Capture Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-1">Get Free Access</h2>
                <p className="text-sm text-gray-500">Enter your contact to start reading the free preview pages</p>
              </div>

              {/* Toggle email/mobile */}
              <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setContactType('email')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${contactType === 'email' ? 'bg-white shadow text-primary-700' : 'text-gray-500'}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => setContactType('mobile')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${contactType === 'mobile' ? 'bg-white shadow text-primary-700' : 'text-gray-500'}`}
                >
                  <Phone className="w-3.5 h-3.5" /> Mobile
                </button>
              </div>

              <input
                type={contactType === 'email' ? 'email' : 'tel'}
                placeholder={contactType === 'email' ? 'your@email.com' : '10-digit mobile number'}
                value={contactInput}
                onChange={e => setContactInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleContactSubmit()}
                className="input w-full mb-4"
                autoFocus
              />

              <button
                onClick={handleContactSubmit}
                disabled={captureSubmitting || !contactInput.trim()}
                className="btn-primary w-full justify-center py-3 font-bold disabled:opacity-50"
              >
                {captureSubmitting ? 'Please wait...' : 'Start Reading Free Pages'}
              </button>
              <button
                onClick={() => { setShowContactModal(false); setCaptureComplete(true); }}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3"
              >
                Skip for now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}

      <header className={`${nightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center gap-4 sticky top-0 z-20`}>
        <button onClick={() => navigate(-1)} className={`${nightMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'} transition-colors`}>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className={`text-sm font-semibold truncate ${nightMode ? 'text-white' : 'text-gray-900'}`}>{pdf?.title || 'Loading...'}</h1>
          {pdf?.totalPages && (
            <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Page {currentPage} of {pdf.totalPages}
              {stream && !stream.isSubscribed && <span className="ml-2 text-amber-500">· Free preview: {stream.freePreviewPages} pages</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Page jump */}
          <div className="flex items-center gap-1">
            <input
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onBlur={() => goToPage(parseInt(pageInput) || currentPage)}
              onKeyDown={e => e.key === 'Enter' && goToPage(parseInt(pageInput) || currentPage)}
              className={`w-12 text-center text-sm px-1 py-1 rounded-lg border ${nightMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-900'}`}
            />
            <span className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>/ {pdf?.totalPages || '?'}</span>
          </div>

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className={`text-xs font-medium min-w-[36px] text-center ${nightMode ? 'text-gray-300' : 'text-gray-600'}`}>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Night mode */}
          <button onClick={() => setNightMode(!nightMode)} className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-gray-700 text-amber-400' : 'hover:bg-gray-100 text-gray-600'}`}>
            {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Bookmark */}
          <button onClick={() => bookmarkMutation.mutate(currentPage)} className={`p-1.5 rounded-lg ${nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            <Bookmark className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {pdf?.totalPages && (
        <div className={`h-1 ${nightMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <motion.div
            className="h-full bg-primary-600"
            animate={{ width: `${(currentPage / pdf.totalPages) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* PDF viewer */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative">
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative flex items-center justify-center w-full h-full min-h-[450px] md:min-h-[600px] py-8"
            >
              {/* Blurred Canvas Document Preview in Background */}
              {lastValidStream?.signedUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                  <PDFCanvasViewer
                    url={lastValidStream.signedUrl}
                    pageNumber={lastValidStream.page || 1}
                    zoom={zoom}
                    isBlurred={true}
                  />
                </div>
              )}

              {/* Paywall Glass Card Overlay */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-20 w-full max-w-md p-1"
              >
                <div className="card p-6 md:p-8 text-center shadow-2xl bg-white/90 backdrop-blur-xl border border-amber-200/60 rounded-3xl">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5 text-amber-600 shadow-inner">
                    <Lock className="w-7 h-7 md:w-8 md:h-8 text-amber-500 animate-pulse" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2 tracking-tight">Unlock Full Document</h2>
                  <p className="text-gray-600 text-sm mb-3">
                    You've reached page <span className="font-bold text-gray-900">{currentPage}</span> of the free preview.
                  </p>
                  <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-2 md:p-3 mb-5 md:mb-6 text-[11px] md:text-xs text-amber-800 flex items-center justify-center gap-1 md:gap-2">
                    <span className="font-bold">Limit:</span> {stream?.freePreviewPages || pdf?.freePreviewPages || 3} free preview pages • {pdf?.totalPages ? pdf.totalPages - (pdf.freePreviewPages || 3) : 0} premium pages locked
                  </div>
                  <button
                    onClick={() => openSubscriptionModal({ pdfId: pdf?.id, message: 'Unlock full access to all pages of this study note.' })}
                    className="btn-primary w-full justify-center py-3.5 text-base font-bold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
                  >
                    Subscribe & Unlock All Pages
                  </button>
                  <button onClick={() => goToPage(1)} className="btn-ghost w-full justify-center mt-3 text-xs text-gray-500 hover:text-gray-800">
                    ← Back to Page 1
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : pageLoading ? (
            <motion.div key="loading" className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading page {currentPage}...</p>
            </motion.div>
          ) : stream?.signedUrl ? (
            stream.signedUrl.startsWith('data:text/html') ? (
              <motion.div key="no-s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
                <div className="card p-10 text-center shadow-2xl">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">📄</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">PDF Storage Not Configured</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    AWS S3 credentials are not set up. To enable PDF reading:
                  </p>
                  <ol className="text-left text-sm text-gray-600 space-y-2 mb-4">
                    <li className="flex gap-2"><span className="text-primary-600 font-bold">1.</span>Configure <code className="bg-gray-100 px-1 rounded">AWS_ACCESS_KEY_ID</code> and <code className="bg-gray-100 px-1 rounded">AWS_SECRET_ACCESS_KEY</code> in backend <code className="bg-gray-100 px-1 rounded">.env</code></li>
                    <li className="flex gap-2"><span className="text-primary-600 font-bold">2.</span>Set <code className="bg-gray-100 px-1 rounded">AWS_BUCKET_NAME</code> to your S3 bucket</li>
                    <li className="flex gap-2"><span className="text-primary-600 font-bold">3.</span>Upload PDFs via the admin panel</li>
                  </ol>
                </div>
              </motion.div>
            ) : (
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <PDFCanvasViewer
                url={stream.signedUrl}
                pageNumber={currentPage}
                zoom={zoom}
                watermark={stream.watermark}
                isBlurred={false}
              />
            </motion.div>
            )
          ) : null}
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <footer className={`${nightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-6 py-3 flex items-center justify-between sticky bottom-0 z-20`}>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${nightMode ? 'text-gray-300 hover:bg-gray-700 disabled:hover:bg-transparent' : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'}`}
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        {/* Page dots / thumb */}
        <div className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {currentPage} / {pdf?.totalPages || '?'}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={!pdf?.totalPages || currentPage >= pdf.totalPages}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${nightMode ? 'text-gray-300 hover:bg-gray-700 disabled:hover:bg-transparent' : 'text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent'}`}
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
