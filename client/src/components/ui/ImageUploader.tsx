import { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2, Link } from 'lucide-react';
import { uploadsApi } from '../../api/uploads';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function ImageUploader({
  value,
  onChange,
  placeholder = 'Upload an image or enter URL',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const result = await uploadsApi.uploadFile(file);
        onChange(result.url);
      } catch (err) {
        setError('Failed to upload image');
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [urlInput, onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setError(null);
  }, [onChange]);

  if (value) {
    return (
      <div className="relative">
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => setError('Failed to load image')}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 truncate" title={value}>
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <Upload className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop an image here or click to upload
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, WebP up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Link className="w-4 h-4" />
          Or enter URL
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
