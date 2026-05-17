import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { key: 'friends', label: 'Friends' },
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' }
];

const dedupePeople = (list = []) => {
  const seen = new Set();
  return list.filter((person) => {
    const id = String(person?._id || person);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const ProfileConnectionsTabs = ({ user, currentUserId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');

  const lists = {
    friends: dedupePeople(user?.friends),
    followers: dedupePeople(user?.followers),
    following: dedupePeople(user?.following)
  };

  const activeList = lists[activeTab] || [];

  const goToProfile = (personId) => {
    if (String(personId) === String(currentUserId)) {
      navigate('/profile');
    } else {
      navigate(`/profile/${personId}`);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex border-b border-[#ffffff1a]">
        {TABS.map((tab) => {
          const count = lists[tab.key]?.length || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 pb-3 px-2 text-sm md:text-base font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-[var(--color-neon-purple)] text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="font-bold">{count}</span>{' '}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[120px]">
        {activeList.length === 0 ? (
          <div className="text-center py-10 border border-[#ffffff1a] rounded-xl border-dashed text-gray-500 text-sm">
            Nothing yet
          </div>
        ) : (
          <div className="space-y-2">
            {activeList.map((person) => (
              <button
                key={person._id}
                type="button"
                onClick={() => goToProfile(person._id)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-[#111] border border-[#ffffff1a] hover:border-[var(--color-neon-purple)] hover:bg-white/5 transition-all text-left"
              >
                <img
                  src={person.profilePicture || `https://i.pravatar.cc/150?u=${person._id}`}
                  alt={person.username}
                  className="w-12 h-12 rounded-full object-cover border border-[var(--color-neon-blue)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{person.username}</p>
                  <p className="text-xs text-gray-500 truncate">@{person.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileConnectionsTabs;
