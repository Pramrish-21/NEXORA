import React, { useState, useRef } from 'react';
import { Upload, X, Camera, Sparkles, SlidersHorizontal, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../lib/dataService';

interface CreatePostPageProps {
  onSuccess: () => void;
}

const PRESET_PHOTOS = [
  {
    name: 'Shibuya Rain',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Brutalist Angle',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Modular Synth',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Obsidian Cube',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cyber Alley',
    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1000&auto=format&fit=crop&q=80',
  },
  {
    name: 'Analog Neon',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1000&auto=format&fit=crop&q=80',
  },
];

const FILTER_PRESETS = [
  { id: 'normal', name: 'Original', class: '' },
  { id: 'noir', name: 'Noir B&W', class: 'grayscale contrast-125' },
  { id: 'film', name: 'Warm Film', class: 'sepia-[0.25] contrast-105' },
  { id: 'matrix', name: 'Matrix Cyber', class: 'contrast-125 brightness-95 hue-rotate-15' },
  { id: 'vivid', name: 'Deep Vivid', class: 'contrast-110 saturate-125' },
];

const SUGGESTED_TAGS = ['#Nexora', '#DarkSocial', '#Cyberpunk', '#Brutalism', '#Minimal', '#Monochrome'];

export const CreatePostPage: React.FC<CreatePostPageProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrl(event.target.result as string);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setError(null);
    } catch {
      setError('Unable to access camera. You can choose a photo from your files or select a preset below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewUrl(dataUrl);
      stopCamera();
    }
  };

  const handlePublish = async () => {
    if (!previewUrl || !user) return;
    setUploading(true);
    setError(null);

    try {
      await dataService.createPost(user.id, previewUrl, caption, selectedFilter);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to share post');
    } finally {
      setUploading(false);
    }
  };

  const addTag = (tag: string) => {
    setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-900">
        <h2 className="text-base font-bold text-white tracking-wide">New Post</h2>
        {previewUrl && (
          <button
            onClick={handlePublish}
            disabled={uploading}
            className="px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-xl hover:bg-neutral-200 disabled:opacity-40 transition"
          >
            {uploading ? 'Publishing...' : 'Share'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/70 border border-red-900/80 rounded-xl text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Media Selection / Capture View */}
      {!previewUrl && !isCameraActive && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-950 cursor-pointer hover:border-neutral-600 transition group p-4 text-center">
              <Upload className="w-8 h-8 text-neutral-500 group-hover:text-white mb-2 transition" />
              <span className="text-xs text-neutral-300 font-medium">Upload Image</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Device Photo / File</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              onClick={startCamera}
              className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-950 hover:border-neutral-600 transition group p-4 text-center"
            >
              <Camera className="w-8 h-8 text-neutral-500 group-hover:text-white mb-2 transition" />
              <span className="text-xs text-neutral-300 font-medium">Use Camera</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">Take Live Photo</span>
            </button>
          </div>

          {/* Curated Aesthetic Presets */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-neutral-400 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                OR CHOOSE A DARK AESTHETIC PRESET
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PHOTOS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewUrl(p.url)}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-neutral-900 hover:border-white transition"
                >
                  <img src={p.url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-1.5">
                    <span className="text-[10px] text-white truncate font-medium">{p.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder */}
      {isCameraActive && (
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-neutral-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={stopCamera}
              className="flex-1 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="flex-2 py-3 bg-white text-black font-semibold text-xs rounded-xl flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Snapshot</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview, Filter & Caption View */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800">
            <img
              src={previewUrl}
              alt="Preview"
              className={`w-full h-full object-cover ${
                FILTER_PRESETS.find((f) => f.id === selectedFilter)?.class || ''
              }`}
            />
            <button
              onClick={() => {
                setPreviewUrl(null);
                setSelectedFilter('normal');
              }}
              className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black rounded-full text-white backdrop-blur-md transition"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Bar */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs text-neutral-400 font-mono mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>COLOR & MOOD FILTER</span>
            </div>
            <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
              {FILTER_PRESETS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition flex items-center space-x-1 ${
                    selectedFilter === filter.id
                      ? 'bg-white text-black font-semibold'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {selectedFilter === filter.id && <Check className="w-3 h-3" />}
                  <span>{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Caption Input */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a captivating caption or thoughts..."
                rows={3}
                maxLength={300}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-neutral-500">
                {caption.length}/300
              </span>
            </div>

            {/* Quick Hashtags */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 hover:text-white rounded-lg transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => setPreviewUrl(null)}
              className="flex-1 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium rounded-xl text-xs hover:bg-neutral-800 transition"
            >
              Change Photo
            </button>
            <button
              onClick={handlePublish}
              disabled={uploading}
              className="flex-2 py-3 bg-white text-black font-semibold rounded-xl text-xs hover:bg-neutral-200 transition disabled:opacity-50"
            >
              {uploading ? 'Publishing...' : 'Share to Nexora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
