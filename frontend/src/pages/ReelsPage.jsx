import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreVertical, Music } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const { token, user } = useAuthStore();
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/reels/feed', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReels(res.data);
      } catch (err) {
        console.error('Failed to fetch reels', err);
      }
    };
    fetchReels();
  }, [token]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    // Calculate which reel is currently in view
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = containerRef.current.clientHeight;
    const index = Math.round(scrollPosition / windowHeight);
    
    if (index !== currentReelIndex) {
      setCurrentReelIndex(index);
    }
  };

  const likeReel = async (id, index) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/reels/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newReels = [...reels];
      newReels[index].likes = res.data.likes;
      setReels(newReels);
    } catch (err) {
      console.error(err);
    }
  };

  if (reels.length === 0) {
    return <div className="flex h-full items-center justify-center text-gray-500">Loading neon frequencies...</div>;
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-80px)] md:h-screen w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black relative"
    >
      {reels.map((reel, idx) => (
        <div key={reel._id} className="h-full w-full flex justify-center snap-start snap-always relative bg-black">
          {/* Reel Video Container */}
          <div className="relative w-full max-w-lg h-full bg-[#111]">
            {/* If it's a real video:
              <video 
                src={reel.videoUrl} 
                autoPlay={idx === currentReelIndex}
                loop 
                muted={false}
                className="w-full h-full object-cover"
              />
            */}
            {/* Mock video with an image for now if it's an image or placeholder */}
            <img 
              src={reel.videoUrl.startsWith('http') ? reel.videoUrl : `http://localhost:5000/${reel.videoUrl}`} 
              alt="Reel" 
              className="w-full h-full object-cover" 
            />

            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6 z-10">
              <button onClick={() => likeReel(reel._id, idx)} className="flex flex-col items-center group outline-none">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center mb-1 group-hover:bg-white/10 transition-colors">
                  <Heart className={`${reel.likes?.includes(user?.id) ? 'fill-[var(--color-neon-pink)] text-[var(--color-neon-pink)]' : 'text-white'}`} size={24} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">{reel.likes?.length || 0}</span>
              </button>

              <button className="flex flex-col items-center group outline-none">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center mb-1 group-hover:bg-white/10 transition-colors">
                  <MessageCircle className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">{reel.comments?.length || 0}</span>
              </button>

              <button className="flex flex-col items-center group outline-none">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center mb-1 group-hover:bg-white/10 transition-colors">
                  <Share2 className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-semibold drop-shadow-md">Share</span>
              </button>

              <button className="flex items-center justify-center outline-none">
                <MoreVertical className="text-white drop-shadow-md" size={24} />
              </button>
              
              {/* Spinning record for audio */}
              <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden flex items-center justify-center mt-4 animate-[spin_4s_linear_infinite]">
                <img src={reel.author?.profilePicture || `https://i.pravatar.cc/150?u=${reel.author?._id}`} className="w-full h-full object-cover" alt="audio" />
              </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-4 left-4 right-20 z-10">
              <div className="flex items-center space-x-2 mb-3">
                <img src={reel.author?.profilePicture || `https://i.pravatar.cc/150?u=${reel.author?._id}`} className="w-10 h-10 rounded-full border border-white" alt="avatar" />
                <span className="text-white font-bold drop-shadow-md hover:underline cursor-pointer">{reel.author?.username}</span>
                <button className="ml-2 px-3 py-1 text-xs font-bold text-white border border-white rounded-md hover:bg-white hover:text-black transition-colors backdrop-blur-sm">Follow</button>
              </div>
              <p className="text-white text-sm mb-2 drop-shadow-md line-clamp-2">{reel.caption}</p>
              
              <div className="flex items-center text-white/80 text-xs mt-2 drop-shadow-md">
                <Music size={14} className="mr-2" />
                <span className="truncate w-48 animate-[marquee_5s_linear_infinite]">Original Audio - {reel.author?.username}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReelsPage;
