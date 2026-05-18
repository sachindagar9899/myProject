import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, Image as ImageIcon } from 'lucide-react';
import usePostStore from '../store/usePostStore';
import useAuthStore from '../store/useAuthStore';
import StoriesViewer from '../components/StoriesViewer';

const HomePage = () => {
  const { posts, loading, fetchFeed, createPost, likePost, addComment } = usePostStore();
  const { user } = useAuthStore();
  
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) return;
    
    const formData = new FormData();
    formData.append('content', postContent);
    if (postImage) {
      formData.append('media', postImage);
    }
    
    const success = await createPost(formData);
    if (success) {
      setPostContent('');
      setPostImage(null);
      setImagePreview(null);
    }
  };

  const handleComment = async (postId) => {
    if (!commentText[postId]?.trim()) return;
    const success = await addComment(postId, commentText[postId]);
    if (success) {
      setCommentText({ ...commentText, [postId]: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Real Stories Strip */}
      <StoriesViewer />

      {/* Create Post Input */}
      <div className="glass-panel rounded-2xl p-4 mb-8 flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <img src={user?.profilePicture || "https://i.pravatar.cc/150?img=10"} alt="Avatar" className="w-10 h-10 rounded-full" />
          <input 
            type="text" 
            placeholder="What's happening in the neon city?" 
            className="bg-transparent flex-1 outline-none text-sm"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
        </div>
        {imagePreview && (
          <div className="w-full h-48 relative rounded-xl overflow-hidden border border-[#ffffff1a]">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => { setPostImage(null); setImagePreview(null); }}
              className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-[#ffffff1a] pt-3">
          <label className="cursor-pointer flex items-center space-x-2 text-gray-400 hover:text-[var(--color-neon-purple)] transition-colors">
            <ImageIcon size={18} />
            <span className="text-xs font-medium">Add Media</span>
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleImageChange} />
          </label>
          <button 
            onClick={handleCreatePost}
            disabled={!postContent.trim() && !postImage}
            className="bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-8">
        {loading && posts.length === 0 ? (
          <p className="text-center text-gray-500">Loading neon signals...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts yet. Be the first to emit a signal!</p>
        ) : (
          posts.map((post) => (
            <motion.div 
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl overflow-hidden border border-[#ffffff1a]"
            >
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={post.author?.profilePicture || "https://i.pravatar.cc/150?img=20"} alt="Avatar" className="w-10 h-10 rounded-full border border-[var(--color-neon-purple)]" />
                  <div>
                    <h4 className="font-semibold text-sm hover:underline cursor-pointer">{post.author?.username || 'Unknown'}</h4>
                    <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Post Image (if any) */}
              {post.mediaUrl && (
                <div className="w-full max-h-[600px] bg-[#111]">
                  <img src={post.mediaUrl.startsWith('http') ? post.mediaUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/${post.mediaUrl}`} alt="Post content" className="w-full h-full object-contain" />
                </div>
              )}

              {/* Post Actions & Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-4">
                    <button onClick={() => likePost(post._id)} className="flex items-center space-x-1 outline-none">
                      <Heart className={`transition-colors ${post.likes?.includes(user?.id) ? 'text-[var(--color-neon-pink)] fill-[var(--color-neon-pink)]' : 'hover:text-[var(--color-neon-pink)] text-gray-400'}`} />
                    </button>
                    <button onClick={() => setShowComments({...showComments, [post._id]: !showComments[post._id]})} className="outline-none">
                      <MessageCircle className="hover:text-[var(--color-neon-blue)] text-gray-400 transition-colors" />
                    </button>
                    <Share2 className="hover:text-[var(--color-neon-purple)] text-gray-400 cursor-pointer transition-colors" />
                  </div>
                  <Bookmark className="hover:text-white text-gray-400 cursor-pointer transition-colors" />
                </div>
                <p className="text-sm font-medium mb-1">{post.likes?.length || 0} likes</p>
                <p className="text-sm">
                  <span className="font-semibold mr-2">{post.author?.username}</span> 
                  {post.content}
                </p>
                
                {post.comments?.length > 0 && (
                  <p 
                    className="text-xs text-gray-500 mt-2 cursor-pointer hover:underline"
                    onClick={() => setShowComments({...showComments, [post._id]: !showComments[post._id]})}
                  >
                    View all {post.comments.length} comments
                  </p>
                )}

                {/* Comments Section */}
                {showComments[post._id] && (
                  <div className="mt-4 space-y-3 border-t border-[#ffffff1a] pt-3">
                    {post.comments?.map((comment, idx) => (
                      <div key={idx} className="flex space-x-2 text-sm">
                        <span className="font-semibold">{comment.user?.username}</span>
                        <span className="text-gray-300">{comment.text}</span>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2 mt-2">
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        className="bg-transparent flex-1 outline-none text-sm text-white placeholder-gray-500"
                        value={commentText[post._id] || ''}
                        onChange={(e) => setCommentText({...commentText, [post._id]: e.target.value})}
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post._id)}
                      />
                      <button 
                        onClick={() => handleComment(post._id)}
                        className="text-[var(--color-neon-blue)] text-sm font-semibold"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default HomePage;
