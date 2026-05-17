import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();
  const { token } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ users: [], posts: [] });
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5000/api/explore/search?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(res.data);
      } catch (err) {
        console.error('Search error', err);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  const handleUserClick = (userId) => {
    setIsOpen(false);
    navigate(`/profile/${userId}`);
    // Update: since we don't have dynamic profile pages per user ID fully setup yet, this assumes we will.
    // Actually our ProfilePage is mostly for 'me'. For now, we can just navigate or trigger a modal.
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md mx-auto mb-4 z-50">
      <div className="flex items-center bg-[#ffffff0a] border border-[#ffffff1a] rounded-full px-4 py-2 focus-within:border-[var(--color-neon-purple)] transition-colors">
        <Search className="text-gray-400 w-5 h-5 mr-2" />
        <input 
          type="text" 
          placeholder="Search AntiGravity..." 
          className="bg-transparent flex-1 outline-none text-sm text-white"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full glass-panel border border-[#ffffff1a] rounded-xl overflow-hidden shadow-2xl">
          <div className="p-3 max-h-80 overflow-y-auto no-scrollbar">
            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Users</h4>
            {results.users.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No users found</p>
            ) : (
              results.users.map(u => (
                <div 
                  key={u._id} 
                  onClick={() => handleUserClick(u._id)}
                  className="flex items-center space-x-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors mb-1"
                >
                  <img src={u.profilePicture || `https://i.pravatar.cc/150?u=${u._id}`} className="w-8 h-8 rounded-full" alt="avatar" />
                  <div>
                    <p className="text-sm font-semibold">{u.username}</p>
                    <p className="text-xs text-gray-400 truncate">{u.bio || 'Neon citizen'}</p>
                  </div>
                </div>
              ))
            )}

            <h4 className="text-xs font-semibold text-gray-500 mb-2 mt-4 uppercase tracking-wider">Posts & Tags</h4>
            {results.posts.length === 0 ? (
              <p className="text-sm text-gray-400">No posts found</p>
            ) : (
              results.posts.map(p => (
                <div 
                  key={p._id} 
                  className="p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors mb-1"
                >
                  <p className="text-sm text-gray-300 truncate">{p.content}</p>
                  <p className="text-xs text-[var(--color-neon-blue)]">by {p.author?.username}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
