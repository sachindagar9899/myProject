import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const ExplorePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchExplore = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/explore', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPosts(res.data);
      } catch (err) {
        console.error('Failed to fetch explore', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExplore();
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-6">Explore</h2>
      
      {loading ? (
        <div className="flex justify-center text-gray-500 mt-10">Loading neon signals...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No trending posts found.</div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {posts.map((post) => (
            <motion.div 
              key={post._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="relative aspect-square bg-[#111] overflow-hidden group cursor-pointer rounded-sm md:rounded-xl"
            >
              <img 
                src={post.mediaUrl ? (post.mediaUrl.startsWith('http') ? post.mediaUrl : `http://localhost:5000/${post.mediaUrl}`) : `https://picsum.photos/600/600?random=${post._id}`} 
                alt="Explore post" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              
              {/* Overlay with stats on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-6 text-white font-bold">
                <div className="flex items-center space-x-2">
                  <Heart className="fill-white" />
                  <span>{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="fill-white" />
                  <span>{post.comments?.length || 0}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
