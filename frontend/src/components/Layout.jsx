import { Outlet, Link } from 'react-router-dom';
import { Home, Compass, Film, User, MessageCircle, Bell, Settings } from 'lucide-react';
import SearchBar from './SearchBar';
import useAuthStore from '../store/useAuthStore';
import useMessageStore from '../store/useMessageStore';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Badge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const NavItem = ({ to, icon, label, badge, badgeOnIcon }) => (
  <Link to={to} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-all hover:text-[var(--color-neon-blue)] group">
    <div className="flex items-center space-x-4">
      <span className="relative text-gray-400 group-hover:text-[var(--color-neon-purple)] transition-colors">
        {icon}
        {badgeOnIcon && badge > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[#0a0a0a]">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="font-medium">{label}</span>
    </div>
    {!badgeOnIcon && <Badge count={badge} />}
  </Link>
);

const Layout = () => {
  const { user, token } = useAuthStore();
  const { unreadCount, initSocket, fetchUnread } = useMessageStore();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.id || !token) return;

    initSocket(user.id, token);

    const fetchPending = async () => {
      try {
        const userRes = await axios.get(`http://localhost:5000/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPendingCount(userRes.data.pendingRequests?.length || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPending();
    fetchUnread(token);
    const interval = setInterval(() => {
      fetchPending();
      fetchUnread(token);
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id, token, initSocket, fetchUnread]);

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#e5e5e5]">
      <aside className="w-64 glass-panel border-r border-[#ffffff1a] hidden md:flex flex-col">
        <div className="p-6 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] font-sans tracking-widest uppercase">
          AntiGravity
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem to="/" icon={<Home />} label="Home" />
          <NavItem to="/explore" icon={<Compass />} label="Explore" />
          <NavItem to="/reels" icon={<Film />} label="Reels" />
          <NavItem to="/messages" icon={<MessageCircle />} label="Messages" badge={unreadCount} badgeOnIcon />
          <NavItem to="/notifications" icon={<Bell />} label="Notifications" badge={pendingCount} />
          <NavItem to="/profile" icon={<User />} label="Profile" />
          <NavItem to="/settings" icon={<Settings />} label="Settings" />
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col p-4 md:p-6 pb-24 md:pb-6">
        <SearchBar />
        <Outlet />
      </main>

      <aside className="w-80 glass-panel border-l border-[#ffffff1a] hidden lg:block p-6">
        <h3 className="text-xl font-semibold mb-4">Trending</h3>
        <div className="space-y-4">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[var(--color-neon-purple)] transition-colors">
            <p className="text-sm text-gray-400">#Cyberpunk2077</p>
            <p className="font-medium">12.5k Posts</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-[var(--color-neon-blue)] transition-colors">
            <p className="text-sm text-gray-400">#NeonVibes</p>
            <p className="font-medium">8.2k Posts</p>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 w-full glass-panel border-t border-[#ffffff1a] flex justify-around p-3 z-50">
        <Link to="/" className="p-2"><Home /></Link>
        <Link to="/explore" className="p-2"><Compass /></Link>
        <Link to="/reels" className="p-2"><Film /></Link>
        <Link to="/messages" className="p-2 relative flex flex-col items-center">
          <MessageCircle />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 right-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/notifications" className="p-2 relative flex flex-col items-center">
          <Bell />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 right-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </Link>
        <Link to="/profile" className="p-2"><User /></Link>
      </nav>
    </div>
  );
};

export default Layout;

