import { useState } from 'react';
import { User, Shield, Lock, Bell, Palette, Database, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, token, logout, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  // Profile Form State
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    name: user?.name || '',
    bio: user?.bio || '',
    website: user?.settings?.profile?.website || '',
    gender: user?.settings?.profile?.gender || '',
  });
  
  // Privacy Form State
  const [privacyData, setPrivacyData] = useState({
    isPrivate: user?.settings?.privacy?.isPrivate || false,
    whoCanMessage: user?.settings?.privacy?.whoCanMessage || 'everyone',
    whoCanCall: user?.settings?.privacy?.whoCanCall || 'friends',
    hideOnlineStatus: user?.settings?.privacy?.hideOnlineStatus || false,
    hideLastSeen: user?.settings?.privacy?.hideLastSeen || false,
    storyPrivacy: user?.settings?.privacy?.storyPrivacy || 'everyone',
    commentControls: user?.settings?.privacy?.commentControls || 'everyone',
    tagMentionControls: user?.settings?.privacy?.tagMentionControls || 'everyone'
  });

  const [profilePicFile, setProfilePicFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage('Updating...');
    try {
      const formData = new FormData();
      Object.keys(profileData).forEach(key => formData.append(key, profileData[key]));
      if (profilePicFile) {
        formData.append('profilePicture', profilePicFile);
      }

      await axios.put('http://localhost:5000/api/settings/profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Profile updated successfully!');
      checkAuth(); // Refresh user state
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  const handlePrivacyUpdate = async (field, value) => {
    try {
      const updatedData = { ...privacyData, [field]: value };
      setPrivacyData(updatedData);
      
      await axios.put('http://localhost:5000/api/settings/privacy', updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Privacy settings saved.');
      checkAuth();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update privacy settings');
      setPrivacyData(privacyData); // revert
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const tabs = [
    { id: 'profile', icon: <User size={18} />, label: 'Edit Profile' },
    { id: 'account', icon: <Shield size={18} />, label: 'Account & Security' },
    { id: 'privacy', icon: <Lock size={18} />, label: 'Privacy' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'appearance', icon: <Palette size={18} />, label: 'Appearance' },
    { id: 'data', icon: <Database size={18} />, label: 'Data Management' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full max-w-6xl mx-auto w-full glass-panel rounded-none md:rounded-2xl overflow-hidden md:my-6 md:border border-[#ffffff1a]">
      {/* Settings Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#ffffff1a] bg-[#111]/50 md:min-h-[600px] flex flex-row md:flex-col overflow-x-auto no-scrollbar">
        <h2 className="hidden md:block p-6 text-xl font-bold text-white border-b border-[#ffffff1a]">Settings</h2>
        <div className="flex md:flex-col p-2 md:p-4 space-x-2 md:space-x-0 md:space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap mt-auto">
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-6 overflow-y-auto no-scrollbar relative min-h-[500px]">
        {message && (
          <div className="absolute top-4 right-4 bg-white/10 border border-[var(--color-neon-purple)] text-white px-4 py-2 rounded-md backdrop-blur-md z-10">
            {message}
          </div>
        )}

        {/* --- EDIT PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold mb-6">Edit Profile</h3>
            
            <div className="flex items-center space-x-6 mb-8 bg-[#111] p-4 rounded-xl border border-[#ffffff1a]">
              <img 
                src={profilePicFile ? URL.createObjectURL(profilePicFile) : (user?.profilePicture || `https://i.pravatar.cc/150?u=${user?._id}`)} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-neon-blue)]"
              />
              <div>
                <p className="font-bold text-lg">{user?.username}</p>
                <label className="cursor-pointer text-[var(--color-neon-blue)] text-sm font-semibold hover:text-[var(--color-neon-purple)] transition-colors">
                  Change Profile Photo
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setProfilePicFile(e.target.files[0])} />
                </label>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} className="w-full bg-[#111] border border-[#ffffff1a] rounded-lg p-3 text-white focus:border-[var(--color-neon-purple)] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full bg-[#111] border border-[#ffffff1a] rounded-lg p-3 text-white focus:border-[var(--color-neon-purple)] outline-none" placeholder="Real Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} rows="3" className="w-full bg-[#111] border border-[#ffffff1a] rounded-lg p-3 text-white focus:border-[var(--color-neon-purple)] outline-none resize-none" placeholder="Tell us about yourself..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website</label>
                <input type="url" value={profileData.website} onChange={e => setProfileData({...profileData, website: e.target.value})} className="w-full bg-[#111] border border-[#ffffff1a] rounded-lg p-3 text-white focus:border-[var(--color-neon-purple)] outline-none" placeholder="https://" />
              </div>
              <button type="submit" className="px-6 py-3 bg-[var(--color-neon-blue)] text-black font-bold rounded-lg hover:bg-[var(--color-neon-purple)] hover:text-white transition-colors w-full md:w-auto">
                Save Profile
              </button>
            </form>
          </div>
        )}

        {/* --- ACCOUNT TAB --- */}
        {activeTab === 'account' && (
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold mb-6">Account & Security</h3>
            <div className="space-y-4">
              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl">
                <h4 className="font-semibold mb-2">Change Password</h4>
                <div className="space-y-3">
                  <input type="password" placeholder="Current Password" className="w-full bg-black/50 border border-[#ffffff1a] rounded-lg p-2 text-white" />
                  <input type="password" placeholder="New Password" className="w-full bg-black/50 border border-[#ffffff1a] rounded-lg p-2 text-white" />
                  <button className="px-4 py-2 bg-[var(--color-neon-purple)] text-white font-bold rounded-lg hover:bg-[var(--color-neon-blue)] transition-colors">Update Password</button>
                </div>
              </div>

              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl mt-4">
                <h4 className="font-semibold mb-4 text-[var(--color-neon-blue)]">Two-Factor Authentication</h4>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-medium">Use Authenticator App</p>
                    <p className="text-xs text-gray-400">Generate verification codes using an app like Google Authenticator.</p>
                  </div>
                  <ToggleSwitch checked={false} onChange={() => { setMessage('2FA setup coming soon'); setTimeout(() => setMessage(''), 3000); }} />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Text Message (SMS)</p>
                    <p className="text-xs text-gray-400">Receive codes via SMS to your verified mobile number.</p>
                  </div>
                  <ToggleSwitch checked={false} onChange={() => { setMessage('SMS OTP setup coming soon'); setTimeout(() => setMessage(''), 3000); }} />
                </div>
              </div>

              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl mt-4">
                <h4 className="font-semibold mb-4 text-[var(--color-neon-purple)]">Active Devices (Sessions)</h4>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Shield size={18} /></div>
                    <div>
                      <p className="font-medium text-sm">Windows PC &bull; Chrome</p>
                      <p className="text-xs text-[var(--color-neon-blue)]">Active Now &bull; Tokyo, Japan</p>
                    </div>
                  </div>
                  <button className="text-xs border border-white/20 px-2 py-1 rounded hover:bg-white/10">Log Out</button>
                </div>
              </div>

              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl">
                <h4 className="font-semibold mb-2 text-red-400">Danger Zone</h4>
                <button className="px-4 py-2 border border-red-500 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-colors mr-3">Log out of all devices</button>
              </div>
            </div>
          </div>
        )}

        {/* --- PRIVACY TAB --- */}
        {activeTab === 'privacy' && (
          <div className="max-w-xl pb-10">
            <h3 className="text-2xl font-bold mb-6">Privacy</h3>
            <div className="space-y-6">
              
              {/* Account Privacy */}
              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl">
                <h4 className="font-semibold mb-4 text-[var(--color-neon-purple)]">Account Privacy</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Private Account</p>
                    <p className="text-xs text-gray-400">When your account is public, your profile and posts can be seen by anyone.</p>
                  </div>
                  <ToggleSwitch checked={privacyData.isPrivate} onChange={(val) => handlePrivacyUpdate('isPrivate', val)} />
                </div>
              </div>

              {/* Interactions */}
              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl">
                <h4 className="font-semibold mb-4 text-[var(--color-neon-blue)]">Interactions</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">Who can message me</p>
                    <select 
                      value={privacyData.whoCanMessage}
                      onChange={(e) => handlePrivacyUpdate('whoCanMessage', e.target.value)}
                      className="bg-black/50 border border-[#ffffff1a] rounded px-2 py-1 text-sm text-gray-300 outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="none">No One</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">Who can call/video call me</p>
                    <select 
                      value={privacyData.whoCanCall}
                      onChange={(e) => handlePrivacyUpdate('whoCanCall', e.target.value)}
                      className="bg-black/50 border border-[#ffffff1a] rounded px-2 py-1 text-sm text-gray-300 outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="none">No One</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">Who can see my stories</p>
                    <select 
                      value={privacyData.storyPrivacy}
                      onChange={(e) => handlePrivacyUpdate('storyPrivacy', e.target.value)}
                      className="bg-black/50 border border-[#ffffff1a] rounded px-2 py-1 text-sm text-gray-300 outline-none"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Activity Status */}
              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl space-y-4">
                <h4 className="font-semibold mb-2 text-[var(--color-neon-pink)]">Activity Status</h4>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">Hide Online Status</p>
                    <p className="text-xs text-gray-400">You won't be able to see when others are online if you hide yours.</p>
                  </div>
                  <ToggleSwitch checked={privacyData.hideOnlineStatus} onChange={(val) => handlePrivacyUpdate('hideOnlineStatus', val)} />
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">Hide Last Seen</p>
                  </div>
                  <ToggleSwitch checked={privacyData.hideLastSeen} onChange={(val) => handlePrivacyUpdate('hideLastSeen', val)} />
                </div>
              </div>

              {/* Blocked Users */}
              <div className="p-4 bg-[#111] border border-[#ffffff1a] rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Blocked Users</p>
                  <span className="text-gray-400 text-sm">0 users &gt;</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- APPEARANCE TAB --- */}
        {activeTab === 'appearance' && (
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold mb-6">Appearance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#111] border border-[var(--color-neon-purple)] rounded-xl cursor-pointer text-center">
                <div className="w-full h-24 bg-[#050505] border border-white/10 rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-[var(--color-neon-purple)] drop-shadow-[0_0_8px_var(--color-neon-purple)]">Neon Dark</span>
                </div>
                <p className="font-medium">Cyberpunk (Active)</p>
              </div>
              <div className="p-4 bg-[#111] border border-[#ffffff1a] hover:border-[var(--color-neon-blue)] rounded-xl cursor-pointer text-center opacity-50">
                <div className="w-full h-24 bg-white border border-gray-300 rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-black font-bold">Light Mode</span>
                </div>
                <p className="font-medium">Classic Light (Soon)</p>
              </div>
            </div>
          </div>
        )}

        {/* --- OTHER TABS PLACEHOLDERS --- */}
        {['notifications', 'data'].includes(activeTab) && (
          <div className="max-w-xl h-full flex flex-col items-center justify-center text-gray-500">
            <Bell size={48} className="mb-4 opacity-50 text-[var(--color-neon-blue)]" />
            <h3 className="text-xl font-bold mb-2 text-white">Feature in Development</h3>
            <p className="text-center text-sm">The {activeTab} settings are being securely encrypted and will be available in the next system update.</p>
          </div>
        )}

      </div>
    </div>
  );
};

// Reusable Toggle Switch Component
const ToggleSwitch = ({ checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-[var(--color-neon-purple)]' : 'bg-gray-600'}`}
  >
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
);

export default SettingsPage;
