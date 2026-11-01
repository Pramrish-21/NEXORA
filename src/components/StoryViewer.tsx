import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story } from '../types/database';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  if (!currentStory) return null;

  return (
    <div
      onClick={handleNext}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
    >
      <div className="relative w-full max-w-md h-full max-h-[92vh] bg-neutral-950 flex flex-col justify-between overflow-hidden sm:rounded-2xl border border-neutral-900">
        {/* Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex space-x-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 linear"
                style={{
                  width:
                    idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* User Header */}
        <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/60 bg-neutral-800">
              <img
                src={currentStory.user.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">@{currentStory.user.username}</p>
              <p className="text-[10px] text-neutral-400">Story • Recent</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 bg-black/40 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Main Image */}
        <div className="w-full h-full flex items-center justify-center relative">
          <img
            src={currentStory.image_url}
            alt="Story"
            className="w-full h-full object-cover"
          />

          {/* Touch Nav Areas */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-0 w-1/3 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-0 w-2/3 cursor-pointer"
          />
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            Tap right to advance, left to go back
          </span>
          <div className="flex space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 bg-black/50 text-white rounded-full disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 bg-black/50 text-white rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
