import { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StoriesViewer = () => {
  const [groupedStories, setGroupedStories] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/stories/feed`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroupedStories(res.data);
      } catch (err) {
        console.error('Failed to fetch stories', err);
      }
    };
    fetchStories();
  }, [token]);

  // Handle story auto-advance
  useEffect(() => {
    if (activeGroupIndex !== null) {
      const currentGroup = groupedStories[activeGroupIndex];
      const timer = setTimeout(() => {
        handleNext();
      }, 5000); // 5 seconds per story
      return () => clearTimeout(timer);
    }
  }, [activeGroupIndex, activeStoryIndex, groupedStories]);

  const handleNext = () => {
    const currentGroup = groupedStories[activeGroupIndex];
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeGroupIndex < groupedStories.length - 1) {
      setActiveGroupIndex(prev => prev + 1);
      setActiveStoryIndex(0);
    } else {
      closeViewer();
    }
  };

  const handlePrev = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex(prev => prev - 1);
      const prevGroup = groupedStories[activeGroupIndex - 1];
      setActiveStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const openViewer = (index) => {
    setActiveGroupIndex(index);
    setActiveStoryIndex(0);
    document.body.style.overflow = 'hidden';
  };

  const closeViewer = () => {
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
    document.body.style.overflow = 'auto';
  };

  if (groupedStories.length === 0) return null;

  const currentGroup = activeGroupIndex !== null ? groupedStories[activeGroupIndex] : null;
  const currentStory = currentGroup ? currentGroup.stories[activeStoryIndex] : null;

  return (
    <>
      {/* Stories Strip (Horizontal scroll) */}
      <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-6 w-full">
        {groupedStories.map((group, idx) => (
          <div 
            key={group.author._id} 
            onClick={() => openViewer(idx)}
            className="flex flex-col items-center space-y-1 min-w-max cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[var(--color-neon-purple)] to-[var(--color-neon-pink)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#111] rounded-full border-2 border-black overflow-hidden">
                <img src={group.author.profilePicture || `https://i.pravatar.cc/150?u=${group.author._id}`} alt="Story" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-xs text-gray-400 truncate w-16 text-center">{group.author.username}</span>
          </div>
        ))}
      </div>

      {/* Fullscreen Story Viewer Modal */}
      <AnimatePresence>
        {activeGroupIndex !== null && currentStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="relative w-full max-w-md h-[100dvh] md:h-[90vh] md:rounded-xl overflow-hidden bg-[#111]">
              
              {/* Progress Bars */}
              <div className="absolute top-0 left-0 w-full flex space-x-1 p-2 z-20">
                {currentGroup.stories.map((s, i) => (
                  <div key={s._id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white"
                      initial={{ width: i < activeStoryIndex ? '100%' : '0%' }}
                      animate={{ width: i === activeStoryIndex ? '100%' : i < activeStoryIndex ? '100%' : '0%' }}
                      transition={{ duration: i === activeStoryIndex ? 5 : 0, ease: 'linear' }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-4 left-0 w-full flex justify-between items-center px-4 z-20">
                <div className="flex items-center space-x-2 drop-shadow-md">
                  <img src={currentGroup.author.profilePicture || `https://i.pravatar.cc/150?u=${currentGroup.author._id}`} className="w-8 h-8 rounded-full border border-white" alt="avatar" />
                  <span className="text-white font-semibold text-sm">{currentGroup.author.username}</span>
                  <span className="text-white/60 text-xs text-center">&bull; {new Date(currentStory.createdAt).getHours()}h</span>
                </div>
                <button onClick={closeViewer} className="text-white drop-shadow-md hover:text-[var(--color-neon-pink)] transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Story Content */}
              <div className="w-full h-full relative">
                <img 
                  src={currentStory.mediaUrl.startsWith('http') ? currentStory.mediaUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/${currentStory.mediaUrl}`} 
                  className="w-full h-full object-cover" 
                  alt="story" 
                />
                
                {/* Touch Zones for navigation */}
                <div className="absolute inset-0 flex">
                  <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
                  <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
                </div>
              </div>

              {/* Desktop Nav Arrows */}
              <button onClick={handlePrev} className="hidden md:flex absolute top-1/2 -left-12 text-white/50 hover:text-white transform -translate-y-1/2">
                <ChevronLeft size={36} />
              </button>
              <button onClick={handleNext} className="hidden md:flex absolute top-1/2 -right-12 text-white/50 hover:text-white transform -translate-y-1/2">
                <ChevronRight size={36} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoriesViewer;
