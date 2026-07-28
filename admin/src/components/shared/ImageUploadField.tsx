import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Link2, Loader2 } from 'lucide-react';
import api from '../../lib/api';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  hint?: string;
  accept?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = 'https://... or upload',
  hint,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'url' | 'upload'>('url');

  const getProxyUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/api/v1/files/public/')) {
      return '/api/v1/files/public/' + url.split('/api/v1/files/public/')[1];
    }
    return url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post<any>('/admin/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.data?.url) {
        onChange(res.data.data.url);
        setMode('url');
      } else {
        setError('Upload failed — no URL returned');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-gray-700 uppercase">{label}</label>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              mode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link2 className="w-3 h-3" /> URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              mode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Preview */}
        <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden relative group">
          {value ? (
            <>
              <img src={getProxyUrl(value)} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <ImageIcon className="w-5 h-5 text-gray-300 hidden" />
            </>
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-300" />
          )}
        </div>

        {mode === 'url' ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
            {value && (
              <button type="button" onClick={() => onChange('')} className="p-1.5 text-gray-400 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1">
            <label className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-50 border-2 border-dashed border-primary-200 rounded-xl cursor-pointer hover:bg-primary-100 transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  <span className="text-xs font-semibold text-primary-700">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-semibold text-primary-700">Choose image file</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
