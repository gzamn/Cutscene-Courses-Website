import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Film, 
  Image as ImageIcon, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Link as LinkIcon,
  Play,
  Sparkles,
  FileVideo
} from 'lucide-react';

interface DirectBunnyUploaderProps {
  mediaUrl: string;
  thumbnailUrl?: string;
  onMediaChange: (url: string, thumbnail?: string, metadata?: { duration?: number; size?: number; type?: string }) => void;
  accept?: 'video' | 'image' | 'both';
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  className?: string;
}

export function DirectBunnyUploader({
  mediaUrl,
  thumbnailUrl,
  onMediaChange,
  accept = 'both',
  maxSizeMB = 150,
  label = "Upload Reel or Media",
  hint = "Drag & drop your video file (.mp4, .mov, .webm) or click to browse",
  className = ""
}: DirectBunnyUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<string>('');
  const [showLinkFallback, setShowLinkFallback] = useState(false);
  const [manualLinkInput, setManualLinkInput] = useState(mediaUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine accepted MIME types
  const acceptMime = accept === 'video' 
    ? 'video/mp4,video/quicktime,video/webm,video/x-matroska'
    : accept === 'image'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : 'video/mp4,video/quicktime,video/webm,video/x-matroska,image/jpeg,image/png,image/webp,image/gif';

  // Helper to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Generate thumbnail from video file client-side
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
          video.currentTime = Math.min(1.0, video.duration / 2 || 0.5);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth || 1280, 1280);
            canvas.height = Math.min(video.videoHeight || 720, 720);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              URL.revokeObjectURL(video.src);
              resolve(dataUrl);
              return;
            }
          } catch (e) {
            console.warn('Canvas thumbnail capture failed:', e);
          }
          URL.revokeObjectURL(video.src);
          resolve('');
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve('');
        };
      } catch (e) {
        resolve('');
      }
    });
  };

  // Direct Bunny CDN Upload Handler
  const uploadFileToBunny = async (file: File) => {
    // 1. Validation
    setUploadError(null);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

    if (accept === 'video' && !isVideo) {
      setUploadError('Please select a valid video file (.mp4, .mov, .webm).');
      return;
    }
    if (accept === 'image' && !isImage) {
      setUploadError('Please select a valid image file (.png, .jpg, .webp).');
      return;
    }
    if (!isVideo && !isImage) {
      setUploadError('Unsupported file format. Please upload a video or image.');
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File is too large (${formatBytes(file.size)}). Max allowed size is ${maxSizeMB}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentFileName(file.name);
    setCurrentFileSize(formatBytes(file.size));

    // Optional: generate poster thumbnail immediately if video
    let capturedThumbnail = '';
    if (isVideo) {
      capturedThumbnail = await generateVideoThumbnail(file);
    }

    try {
      // Step A: Request signed upload endpoint
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name })
      });

      if (!signRes.ok) {
        throw new Error('Failed to acquire secure Bunny CDN upload parameters.');
      }

      const signData = await signRes.json();
      const uploadUrl = signData.uploadUrl;

      if (!uploadUrl) {
        throw new Error('Invalid upload endpoint returned by server.');
      }

      // Step B: Stream upload via XMLHttpRequest for granular progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              const finalPublicUrl = res.publicUrl || res.url;
              if (finalPublicUrl) {
                onMediaChange(finalPublicUrl, capturedThumbnail || undefined, {
                  size: file.size,
                  type: file.type
                });
                resolve();
              } else {
                reject(new Error('BunnyCDN public delivery URL missing from response.'));
              }
            } catch (err) {
              reject(new Error('Failed to parse server upload response.'));
            }
          } else {
            reject(new Error(`Upload failed with server status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error occurred while uploading to BunnyCDN.'));
        };

        xhr.send(file);
      });

      setUploadProgress(100);
    } catch (err: any) {
      console.error('Bunny upload error:', err);
      setUploadError(err.message || 'Failed to upload media to Bunny CDN.');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFileToBunny(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFileToBunny(file);
    }
  };

  const handleRemoveMedia = () => {
    onMediaChange('', '');
    setCurrentFileName('');
    setCurrentFileSize('');
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualLinkApply = () => {
    if (manualLinkInput.trim()) {
      onMediaChange(manualLinkInput.trim());
      setShowLinkFallback(false);
    }
  };

  const isVideoUrl = mediaUrl && (
    mediaUrl.endsWith('.mp4') || 
    mediaUrl.endsWith('.mov') || 
    mediaUrl.endsWith('.webm') || 
    mediaUrl.includes('b-cdn.net') ||
    mediaUrl.includes('youtube.com') ||
    mediaUrl.includes('youtu.be') ||
    mediaUrl.includes('vimeo.com')
  );

  const isDirectVideo = mediaUrl && (
    mediaUrl.endsWith('.mp4') || 
    mediaUrl.endsWith('.mov') || 
    mediaUrl.endsWith('.webm') || 
    mediaUrl.includes('b-cdn.net')
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
            {label}
          </label>
          {!mediaUrl && !isUploading && (
            <button
              type="button"
              onClick={() => setShowLinkFallback(!showLinkFallback)}
              className="text-[10px] font-mono text-gray-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showLinkFallback ? 'Switch to Direct Upload' : 'Paste external link instead'}</span>
            </button>
          )}
        </div>
      )}

      {/* MANUAL LINK FALLBACK (OPTIONAL ALTERNATIVE) */}
      {showLinkFallback && !mediaUrl && !isUploading ? (
        <div className="bg-zinc-950/80 border border-purple-900/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <LinkIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Paste a YouTube, Vimeo, or direct video URL:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualLinkInput}
              onChange={(e) => setManualLinkInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://..."
              className="flex-1 bg-black border border-purple-900/40 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="button"
              onClick={handleManualLinkApply}
              disabled={!manualLinkInput.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}

      {/* UPLOADED STATE: PREVIEW PLAYER / CARD */}
      {mediaUrl ? (
        <div className="relative rounded-2xl overflow-hidden bg-black border border-purple-800/40 shadow-xl group">
          {isDirectVideo ? (
            <div className="relative aspect-video max-h-72 w-full bg-zinc-950 flex items-center justify-center">
              <video
                src={mediaUrl}
                controls
                playsInline
                poster={thumbnailUrl || undefined}
                className="w-full h-full object-contain"
              />
            </div>
          ) : isVideoUrl && !isDirectVideo ? (
            <div className="relative aspect-video max-h-72 w-full bg-black">
              <iframe
                src={mediaUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video Preview"
              />
            </div>
          ) : (
            <div className="relative aspect-video max-h-72 w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
              <img
                src={mediaUrl}
                alt="Media Preview"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Top Bar Info Overlay */}
          <div className="p-3 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-purple-900/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="block text-xs font-bold text-white truncate font-mono">
                  {currentFileName || (mediaUrl.includes('b-cdn.net') ? 'BunnyCDN Direct Media' : 'Media Attached')}
                </span>
                <span className="block text-[10px] text-emerald-400 font-mono">
                  ✓ Ready to publish {currentFileSize && `• ${currentFileSize}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-gray-300 hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveMedia}
                className="p-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/40 text-red-300 hover:text-white rounded-xl transition-all cursor-pointer"
                title="Remove Media"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : isUploading ? (
        /* ACTIVE UPLOAD PROGRESS STATE */
        <div className="bg-zinc-950/90 border border-purple-600/50 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto shadow-lg shadow-purple-600/20 animate-pulse">
            <FileVideo className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white tracking-tight">
              Uploading directly to Bunny CDN...
            </h4>
            <p className="text-xs font-mono text-purple-300 truncate max-w-sm mx-auto">
              {currentFileName} {currentFileSize && `(${currentFileSize})`}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto space-y-1.5">
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-purple-900/40 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 rounded-full transition-all duration-300 shadow-md shadow-purple-500/50"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>Streaming bytes to edge storage...</span>
              <span className="font-bold text-purple-400">{uploadProgress}%</span>
            </div>
          </div>
        </div>
      ) : (
        /* HERO DRAG & DROP / CLICK ZONE */
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 group
              ${isDragging 
                ? 'border-purple-500 bg-purple-950/30 scale-[1.01] shadow-2xl shadow-purple-600/20' 
                : 'border-purple-900/40 bg-zinc-950/60 hover:border-purple-500/60 hover:bg-zinc-950/90'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptMime}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto transition-transform group-hover:scale-110 shadow-lg shadow-purple-900/20">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  Drag & drop video reel here, or <span className="text-purple-400 underline decoration-purple-500/50 underline-offset-4">browse files</span>
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  {hint}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-900/40 text-[10px] font-mono text-purple-300">
                  Direct BunnyCDN Upload
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-black/60 border border-white/5 text-[10px] font-mono text-gray-400">
                  Up to {maxSizeMB}MB
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-black/60 border border-white/5 text-[10px] font-mono text-gray-400">
                  MP4, MOV, WebM
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {uploadError && (
            <div className="mt-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
