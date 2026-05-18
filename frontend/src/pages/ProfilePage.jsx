import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, LogOut, Check, X, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfileConnectionsTabs from '../components/ProfileConnectionsTabs';

const ProfilePage = () => {
  const { user: authUser, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/users/${authUser?.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/posts/user/${authUser?.id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setProfileData(userRes.data);
        setPosts(postsRes.data);
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (authUser && token) {
      fetchProfileData();
    } else {
      // If authUser or token is missing, stop loading
      setLoading(false);
    }
  }, [authUser, token]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleRequestAction = async (requesterId, action) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/users/friend-request/${requesterId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state
      setProfileData((prev) => {
        const requester = prev.pendingRequests.find(
          (req) => String(req._id) === String(requesterId)
        );
        const alreadyFriend = prev.friends.some(
          (f) => String(f._id) === String(requesterId)
        );
        return {
          ...prev,
          pendingRequests: prev.pendingRequests.filter(
            (req) => String(req._id) !== String(requesterId)
          ),
          friends:
            action === 'accept' && requester && !alreadyFriend
              ? [...prev.friends, requester]
              : prev.friends
        };
      });
    } catch (error) {
      console.error('Action failed', error);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-neon-purple)]" /></div>;
  }

  const user = profileData || authUser;

  return (
    <div className="max-w-4xl mx-auto w-full pb-24 md:pb-6">
      {/* Cover Photo */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-[var(--color-neon-purple)] via-[#111] to-[var(--color-neon-blue)] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
      </div>

      {/* Profile Info Section */}
      <div className="px-4 md:px-8 relative -mt-16 md:-mt-20 flex flex-col md:flex-row items-start md:items-end justify-between mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-[#050505] relative z-10">
            <img 
              src={user?.profilePicture || "https://i.pravatar.cc/150?img=12"} 
              alt="Profile" 
              className="w-full h-full rounded-full border-4 border-[var(--color-neon-purple)] object-cover"
            />
          </div>
          
          <div className="text-center md:text-left mb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{user?.username || 'CyberNet_User'}</h1>
            <p className="text-gray-400">@netrunner_{user?.id?.slice(-4) || '1024'}</p>
          </div>
        </div>

        <div className="mt-6 md:mt-0 w-full md:w-auto flex justify-center space-x-3">
          <button 
            onClick={() => navigate('/settings')}
            className="px-6 py-2 rounded-xl font-bold bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all"
          >
            Edit Profile
          </button>
          <button 
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl glass-panel border border-[#ffffff1a] hover:bg-white/10 hover:text-red-400 hover:border-red-500/50 transition-all group"
          >
            <LogOut className="w-6 h-6 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Bio and Stats */}
      <div className="px-4 md:px-8 mb-8">
        <p className="text-sm mb-4 max-w-2xl leading-relaxed">
          {user?.bio || 'Jacked into the matrix. Exploring the digital frontier. Full-stack developer by day, netrunner by night. ðŸŒâœ¨'}
        </p>
        
        <div className="flex items-center space-x-4 md:space-x-6 text-sm text-gray-400 mb-6">
          <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> Neo-Tokyo</div>
          <div className="flex items-center"><LinkIcon className="w-4 h-4 mr-1" /> <span className="text-[var(--color-neon-blue)]">antigravity.dev</span></div>
          <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> Joined 2026</div>
        </div>

        <ProfileConnectionsTabs user={user} currentUserId={authUser?.id} />
      </div>

      {/* Pending Friend Requests */}
      {profileData?.pendingRequests?.length > 0 && (
        <div className="px-4 md:px-8 mb-8">
          <h3 className="font-bold text-[var(--color-neon-blue)] mb-4 uppercase tracking-wider text-sm">Pending Friend Requests</h3>
          <div className="space-y-3">
            {profileData.pendingRequests.map(reqUser => (
              <div key={reqUser._id} className="flex items-center justify-between bg-[#111] border border-[#ffffff1a] p-3 rounded-xl">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(`/profile/${reqUser._id}`)}>
                  <img src={reqUser.profilePicture || `https://i.pravatar.cc/150?u=${reqUser._id}`} className="w-10 h-10 rounded-full object-cover" />
                  <span className="font-semibold">{reqUser.username}</span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleRequestAction(reqUser._id, 'accept')} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/40 rounded-lg transition-colors">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleRequestAction(reqUser._id, 'reject')} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="px-4 md:px-8">
        <h3 className="font-bold text-lg mb-4 text-[var(--color-neon-pink)]">Your Posts</h3>
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-10 border border-[#ffffff1a] rounded-xl border-dashed">
            No posts yet. Start sharing!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {posts.map((post) => (
              <motion.div 
                key={post._id}
                whileHover={{ scale: 0.98 }}
                className="aspect-square bg-[#111] cursor-pointer rounded-sm md:rounded-xl overflow-hidden relative group border border-[#ffffff1a]"
              >
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full p-2 text-xs flex items-center justify-center text-center overflow-hidden break-words text-gray-400">
                    {post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2 backdrop-blur-sm">
                  <div className="flex space-x-4">
                    <span className="font-bold flex items-center text-white"><span className="text-[var(--color-neon-pink)] mr-1">â™¥</span> {post.likes?.length || 0}</span>
                    <span className="font-bold flex items-center text-white"><span className="text-[var(--color-neon-blue)] mr-1">ðŸ’¬</span> {post.comments?.length || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
