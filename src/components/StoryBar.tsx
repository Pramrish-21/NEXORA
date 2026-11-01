import React from 'react';
import { Plus } from 'lucide-react';
import { Story, Profile } from '../types/database';

interface StoryBarProps {
  stories: Story[];
  currentUser: Profile | null;
  onSelectStory: (index: number) => void;
  onAddStory: () => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  stories,
  currentUser,
  onSelectStory,
  onAddStory,
}) => {
  return (
    <div className="py-3 px-4 border-b border-neutral-900 overflow-x-auto no-scrollbar flex items-center space-x-3.5">
      {/* Current user add story */}
      <div
        onClick={onAddStory}
        className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0 group"
      >
        <div className="relative w-15 h-15 rounded-full p-0.5 border border-dashed border-neutral-700 group-hover:border-neutral-500 transition">
          <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-800" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center shadow-md">
            <Plus className="w-3 h-3 stroke-[3]" />
          </div>
        </div>
        <span className="text-[11px] text-neutral-400 group-hover:text-white transition truncate max-w-[62px]">
          Your story
        </span>
      </div>

      {/* Friends stories */}
      {stories.map((story, idx) => (
        <div
          key={story.id}
          onClick={() => onSelectStory(idx)}
          className="flex flex-col items-center space-y-1 cursor-pointer flex-shrink-0"
        >
          <div className="w-15 h-15 rounded-full p-[2px] bg-gradient-to-tr from-neutral-200 via-neutral-500 to-white hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full p-[2px] bg-black">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900">
                <img
                  src={story.user.avatar_url}
                  alt={story.user.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-neutral-300 truncate max-w-[62px]">
            {story.user.username}
          </span>
        </div>
      ))}
    </div>
  );
};
