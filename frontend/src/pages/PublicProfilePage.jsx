import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MapPin, Link as LinkIcon, Calendar, UserPlus, Check, Clock, MessageSquare, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import ProfileConnectionsTabs from '../components/ProfileConnectionsTabs';

const PublicProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, token } = useAuthStore();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState('none'); // none | pending | friends | incoming
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (id === currentUser?.id) {
      navigate('/profile'); // Redirect to own profile if clicking self
      return;
    }

    const fetchProfile = async () => {
      try {
        const [userRes, postsRes, myRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:5000/api/posts/user/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`http://localhost:5000/api/users/${currentUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setProfileUser(userRes.data);
        setPosts(postsRes.data);

        const myId = String(currentUser.id);
        const theirId = String(id);

        const isFriend = userRes.data.friends?.some((f) => String(f._id) === myId);
        const isPending = userRes.data.pendingRequests?.some((p) => String(p._id || p) === myId);
        const incomingRequest = myRes.data.pendingRequests?.some((p) => String(p._id || p) === theirId);

        if (isFriend) setFriendStatus('friends');
        else if (isPending) setFriendStatus('pending');
        else if (incomingRequest) setFriendStatus('incoming');
        else setFriendStatus('none');

      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, token, currentUser, navigate]);

  const handleFriendAction = async () => {
    if (friendStatus === 'friends') {
      navigate('/messages'); // Go to chat if already friends
      return;
    }
    
    if (friendStatus === 'pending' || friendStatus === 'incoming') return;

    setActionLoading(true);
    setActionError('');
    try {
      await axios.post(`http://localhost:5000/api/users/friend-request/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriendStatus('pending');
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not send friend request';
      setActionError(msg);
      if (msg.toLowerCase().includes('already friends')) setFriendStatus('friends');
      if (msg.toLowerCase().includes('already sent')) setFriendStatus('pending');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessageClick = () => {
    navigate(`/messages?user=${id}`);
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-neon-purple)]" /></div>;
  }

  if (!profileUser) {
    return <div className="h-full flex items-center justify-center text-red-500">User not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto w-full pb-24 md:pb-6 h-full overflow-y-auto no-scrollbar">
      {/* Cover Photo */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-[var(--color-neon-blue)] via-[#111] to-[var(--color-neon-purple)] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
      </div>

      {/* Profile Info Section */}
      <div className="px-4 md:px-8 relative -mt-16 md:-mt-20 flex flex-col md:flex-row items-start md:items-end justify-between mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-[#050505] relative z-10">
            <img 
              src={profileUser.profilePicture || `https://i.pravatar.cc/150?u=${profileUser._id}`} 
              alt="Profile" 
              className="w-full h-full rounded-full border-4 border-[var(--color-neon-blue)] object-cover bg-[#111]"
            />
          </div>
          
          <div className="text-center md:text-left mb-2">
            <h1 className="text-2xl md:text-3xl font-bold">{profileUser.name || profileUser.username}</h1>
            <p className="text-gray-400">@{profileUser.username}</p>
          </div>
        </div>

        {actionError && (
          <p className="mt-4 text-sm text-red-400 text-center md:text-right">{actionError}</p>
        )}

        <div className="mt-6 md:mt-0 w-full md:w-auto flex flex-col md:flex-row justify-center gap-3">
          <button 
            onClick={handleMessageClick}
            className="px-6 py-2 rounded-xl font-bold transition-all flex items-center justify-center w-full md:w-auto bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            <MessageSquare className="w-5 h-5 mr-2" /> Message
          </button>
          
          <button 
            type="button"
            onClick={friendStatus === 'incoming' ? () => navigate('/notifications') : handleFriendAction}
            disabled={actionLoading || friendStatus === 'pending' || friendStatus === 'friends'}
            className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center justify-center w-full md:w-auto ${
              friendStatus === 'friends' ? 'bg-green-500/20 text-green-500 border border-green-500/50 cursor-default' :
              friendStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 cursor-default' :
              friendStatus === 'incoming' ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/50' :
              'bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] text-black hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
            }`}
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             friendStatus === 'friends' ? <><Check className="w-5 h-5 mr-2" /> Friends</> :
             friendStatus === 'pending' ? <><Clock className="w-5 h-5 mr-2" /> Request Sent</> :
             friendStatus === 'incoming' ? <><UserPlus className="w-5 h-5 mr-2" /> Accept in Notifications</> :
             <><UserPlus className="w-5 h-5 mr-2" /> Add Friend</>}
          </button>
        </div>
      </div>

      {/* Bio and Stats */}
      <div className="px-4 md:px-8 mb-8">
        <p className="text-sm mb-4 max-w-2xl leading-relaxed text-gray-300">
          {profileUser.bio || 'This user prefers to keep an air of mystery.'}
        </p>
        
        <div className="flex items-center space-x-4 md:space-x-6 text-sm text-gray-400 mb-6 flex-wrap gap-y-2">
          {profileUser.settings?.profile?.gender && (
             <div className="flex items-center capitalize">{profileUser.settings.profile.gender}</div>
          )}
          {profileUser.settings?.profile?.website && (
            <div className="flex items-center">
              <LinkIcon className="w-4 h-4 mr-1" /> 
              <a href={profileUser.settings.profile.website} target="_blank" rel="noreferrer" className="text-[var(--color-neon-blue)] hover:underline">
                {profileUser.settings.profile.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> Joined {new Date(profileUser.createdAt).getFullYear()}</div>
        </div>

        <ProfileConnectionsTabs user={profileUser} currentUserId={currentUser?.id} />
      </div>

      {/* Posts Grid */}
      <div className="px-4 md:px-8">
        <h3 className="font-bold text-lg mb-4 text-[var(--color-neon-blue)]">Posts</h3>
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-10 border border-[#ffffff1a] rounded-xl border-dashed">
            No posts yet
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
                    <span className="font-bold flex items-center text-white"><span className="text-[var(--color-neon-pink)] mr-1">♥</span> {post.likes?.length || 0}</span>
                    <span className="font-bold flex items-center text-white"><span className="text-[var(--color-neon-blue)] mr-1">💬</span> {post.comments?.length || 0}</span>
                  </div>
                  {!post.mediaUrl && <p className="text-white text-xs px-2 text-center">{post.content}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfilePage;
