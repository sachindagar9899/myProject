import { useState, useEffect } from 'react';
import { Check, X, Bell, Loader2, UserPlus } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NotificationsPage = () => {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(res.data.pendingRequests || []);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
      }
    };
    if (user && token) fetchRequests();
  }, [user, token]);

  const handleAction = async (id, action) => {
    try {
      await axios.post(`http://localhost:5000/api/users/friend-request/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.filter(req => req._id !== id));
    } catch (err) {
      console.error('Action failed', err);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-neon-purple)]" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full pb-24 md:pb-6 p-4">
      <div className="flex items-center space-x-3 mb-6">
        <Bell className="w-8 h-8 text-[var(--color-neon-blue)]" />
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-[#ffffff1a] rounded-xl border-dashed">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No new notifications right now.</p>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-[var(--color-neon-purple)] uppercase tracking-wider text-sm mb-4">Pending Friend Requests</h3>
            {requests.map(reqUser => (
              <div key={reqUser._id} className="flex items-center justify-between bg-[#111] border border-[#ffffff1a] p-4 rounded-xl hover:border-[var(--color-neon-blue)] transition-colors">
                <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate(`/profile/${reqUser._id}`)}>
                  <div className="relative">
                    <img src={reqUser.profilePicture || `https://i.pravatar.cc/150?u=${reqUser._id}`} className="w-12 h-12 rounded-full object-cover border border-[#ffffff1a]" />
                    <div className="absolute -bottom-1 -right-1 bg-[#111] p-1 rounded-full">
                      <UserPlus className="w-3 h-3 text-[var(--color-neon-purple)]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">{reqUser.username}</h4>
                    <p className="text-xs text-gray-400">wants to be your friend</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button onClick={() => handleAction(reqUser._id, 'accept')} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/40 rounded-lg transition-colors" title="Accept">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleAction(reqUser._id, 'reject')} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/40 rounded-lg transition-colors" title="Decline">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
