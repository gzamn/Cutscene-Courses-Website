import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Loader2, Check } from 'lucide-react';

interface ImageUploaderProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
  maxDimension?: number;
  quality?: number;
}

export function ImageUploader({
  label,
  value,
  onChange,
  placeholder = "Upload image file or paste URL",
  helperText,
  className = "",
  maxDimension = 1200,
  quality = 0.82
}: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress & convert file to Data URL
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          onChange(dataUrl);
        } else {
          onChange(e.target?.result as string);
        }
        setIsProcessing(false);
      };

      img.onerror = () => {
        onChange(e.target?.result as string);
        setIsProcessing(false);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert('Failed to read image file.');
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] text-purple-400 hover:text-purple-300 font-mono underline flex items-center gap-1 cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'Switch to Upload Button' : 'Paste URL instead'}</span>
          </button>
        </div>
      )}

      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {showUrlInput ? (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white rounded-xl cursor-pointer"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-4 transition-all duration-200 flex items-center justify-between gap-4 ${
            dragActive
              ? 'border-purple-500 bg-purple-950/30'
              : value
              ? 'border-purple-900/40 bg-zinc-950'
              : 'border-purple-900/30 bg-black/60 hover:border-purple-500/50'
          }`}
        >
          {/* Left: Thumbnail preview or Icon */}
          <div className="flex items-center gap-3.5 min-w-0">
            {value ? (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-500/30 bg-zinc-900 shrink-0 group">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-300"
                  title="Remove image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-800/30 flex items-center justify-center text-purple-400 shrink-0">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              {value ? (
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Image Selected</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate max-w-[200px] sm:max-w-[280px]">
                    {value.startsWith('data:') ? 'Uploaded local image file' : value}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-white">
                    Upload Image File
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Drag & drop or click upload button (PNG, JPG, WebP)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Upload Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{value ? 'Change Image' : 'Upload Image'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
