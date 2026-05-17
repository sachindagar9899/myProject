import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Video, LogOut, MessageSquare, Search, UserPlus, Check, X, PhoneOff } from 'lucide-react';
import VideoCall from './VideoCall';

export default function ChatApp({ currentUser, socket, onLogout }) {
  const [messages, setMessages] = useState([]); // { id, from, to, text, mediaUrl, mediaType, timestamp }
  const [inputText, setInputText] = useState('');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [viewingProfile, setViewingProfile] = useState(null); // username of profile being viewed
  
  // Call State
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  // Friend System State
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [activeUsersMap, setActiveUsersMap] = useState(new Set()); // keep track of all online users
  const [selectedUser, setSelectedUser] = useState(null); // active chat

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchFriendsData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/friends?username=${currentUser}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        setFriendRequests(data.friendRequests || []);
        setSentRequests(data.sentRequests || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends', err);
    }
  };

  useEffect(() => {
    fetchFriendsData();

    socket.on('active_users', (users) => {
      setActiveUsersMap(new Set(users));
    });

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }]);
    });

    socket.on('message_sent', (msg) => {
      setMessages(prev => [...prev, { ...msg, to: selectedUser, id: Date.now() + Math.random() }]);
    });

    socket.on('incoming_call', (data) => {
      setIncomingCall({ from: data.from, signal: data.signal });
    });

    socket.on('call_ended', () => {
      setActiveCall(null);
    });

    socket.on('friend_request_received', (fromUser) => {
      fetchFriendsData();
    });

    socket.on('friend_request_accepted', (fromUser) => {
      fetchFriendsData();
    });

    return () => {
      socket.off('active_users');
      socket.off('receive_message');
      socket.off('message_sent');
      socket.off('incoming_call');
      socket.off('call_ended');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
    };
  }, [socket, currentUser, selectedUser]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`http://localhost:3001/api/users/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.filter(u => u.username !== currentUser));
      } catch (err) {
        console.error('Search failed', err);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchSearchResults();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser) return;

    socket.emit('send_message', {
      to: selectedUser,
      text: inputText.trim()
    });
    setInputText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;

    const formData = new FormData();
    formData.append('media', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (response.ok) {
        socket.emit('send_message', {
          to: selectedUser,
          text: '',
          mediaUrl: data.url,
          mediaType: data.type
        });
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const startCall = () => {
    if (!selectedUser) return;
    setActiveCall({ partnerName: selectedUser, isCaller: true, signal: null });
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    setActiveCall({ 
      partnerName: incomingCall.from, 
      isCaller: false, 
      signal: incomingCall.signal 
    });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    socket.emit('end_call', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const sendFriendRequest = async (username) => {
    try {
      await fetch('http://localhost:3001/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: currentUser, to: username })
      });
      fetchFriendsData();
    } catch (err) {
      console.error('Failed to send request', err);
    }
  };

  const acceptFriendRequest = async (username) => {
    try {
      await fetch('http://localhost:3001/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, from: username })
      });
      fetchFriendsData();
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const currentMessages = messages.filter(m => 
    (m.from === currentUser && m.to === selectedUser) || 
    (m.from === selectedUser && m.to === currentUser)
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar">{currentUser.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{currentUser}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Online</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
        
        <div style={{ padding: '15px 20px 5px 20px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search users..." 
              style={{ paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.9rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {searchQuery ? (
          <>
            <div style={{ padding: '10px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              SEARCH RESULTS
            </div>
            <div className="user-list">
              {searchResults.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No users found.
                </div>
              ) : (
                searchResults.map(user => (
                  <div 
                    key={user.username} 
                    className={`user-item ${viewingProfile === user.username ? 'active' : ''}`}
                    onClick={() => {
                      setViewingProfile(user.username);
                      setSelectedUser(null);
                    }}
                  >
                    <div className="avatar" style={{ width: '35px', height: '35px', fontSize: '1rem' }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500 }}>{user.username}</div>
                    {user.isOnline && <div className="status-dot" title="Online"></div>}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div style={{ padding: '15px 20px 5px 20px', fontWeight: 600, color: 'var(--accent)', fontSize: '0.8rem' }}>
              FRIEND REQUESTS ({friendRequests.length})
            </div>
            {friendRequests.length === 0 ? (
              <div style={{ padding: '10px 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No pending requests.
              </div>
            ) : (
              <div className="user-list">
                {friendRequests.map(reqUser => (
                  <div key={reqUser} className="user-item" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar" style={{ width: '30px', height: '30px', fontSize: '0.9rem' }}>
                        {reqUser.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{reqUser}</div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      onClick={(e) => { e.stopPropagation(); acceptFriendRequest(reqUser); }}
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '15px 20px 5px 20px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              MY FRIENDS ({friends.length})
            </div>
            
            <div className="user-list">
              {friends.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Search for users to add them as friends!
                </div>
              ) : (
                friends.map(friend => (
                  <div 
                    key={friend} 
                    className={`user-item ${selectedUser === friend ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedUser(friend);
                      setViewingProfile(null);
                    }}
                  >
                    <div className="avatar" style={{ width: '35px', height: '35px', fontSize: '1rem' }}>
                      {friend.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500 }}>{friend}</div>
                    {activeUsersMap.has(friend) && <div className="status-dot"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Area */}
      {viewingProfile ? (
        <div className="chat-area empty-state">
          <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-panel)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', width: '300px' }}>
            <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2.5rem', margin: '0 auto 20px auto' }}>
              {viewingProfile.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ marginBottom: '20px' }}>{viewingProfile}</h2>
            
            {friends.includes(viewingProfile) ? (
              <button 
                className="btn btn-primary w-full"
                onClick={() => {
                  setSelectedUser(viewingProfile);
                  setViewingProfile(null);
                  setSearchQuery('');
                }}
              >
                <MessageSquare size={18} /> Message
              </button>
            ) : friendRequests.includes(viewingProfile) ? (
              <button 
                className="btn btn-primary w-full"
                onClick={() => acceptFriendRequest(viewingProfile)}
              >
                <Check size={18} /> Accept Friend Request
              </button>
            ) : sentRequests.includes(viewingProfile) ? (
              <button 
                className="btn w-full"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}
                disabled
              >
                <Check size={18} /> Request Sent
              </button>
            ) : (
              <button 
                className="btn btn-primary w-full"
                onClick={() => sendFriendRequest(viewingProfile)}
              >
                <UserPlus size={18} /> Add Friend
              </button>
            )}
          </div>
        </div>
      ) : selectedUser ? (
        <div className="chat-area">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar" style={{ width: '35px', height: '35px', fontSize: '1rem' }}>
                {selectedUser.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedUser}</div>
              {activeUsersMap.has(selectedUser) && <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Online</span>}
            </div>
            {activeUsersMap.has(selectedUser) && (
              <button className="btn-icon" onClick={startCall} title="Video Call">
                <Video size={20} />
              </button>
            )}
          </div>
          
          <div className="chat-messages">
            {currentMessages.length === 0 ? (
              <div className="empty-state" style={{ height: '100%' }}>
                <MessageSquare className="empty-state-icon" />
                <p>Say hi to {selectedUser}!</p>
              </div>
            ) : (
              currentMessages.map(msg => (
                <div key={msg.id} className={`message ${msg.from === currentUser ? 'sent' : 'received'}`}>
                  {msg.text && (
                    <div className="message-bubble">{msg.text}</div>
                  )}
                  {msg.mediaUrl && (
                    msg.mediaType.startsWith('image/') ? (
                      <img src={msg.mediaUrl} alt="Shared" className="message-media" />
                    ) : msg.mediaType.startsWith('video/') ? (
                      <video src={msg.mediaUrl} controls className="message-media" />
                    ) : (
                      <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="message-bubble" style={{ textDecoration: 'underline' }}>
                        Download File
                      </a>
                    )
                  )}
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <div className="file-input-wrapper">
              <button type="button" className="btn-icon">
                <ImageIcon size={20} />
              </button>
              <input 
                type="file" 
                accept="image/*,video/*" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Message..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '14px', borderRadius: '50%' }}>
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div className="chat-area empty-state">
          <div style={{ textAlign: 'center' }}>
            <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 20px auto' }}>
              <Send size={40} />
            </div>
            <h2>Your Messages</h2>
            <p style={{ marginTop: '10px' }}>Select a friend to start chatting.</p>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !activeCall && (
        <div className="video-modal" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <h2>{incomingCall.from} is calling you...</h2>
          <div className="call-controls" style={{ marginTop: '20px' }}>
            <button className="control-btn btn-accept" onClick={acceptCall}>
              <Video size={24} />
            </button>
            <button className="control-btn btn-end" onClick={rejectCall}>
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Active Video Call Overlay */}
      {activeCall && (
        <VideoCall 
          socket={socket} 
          currentUser={currentUser} 
          activeCall={activeCall} 
          onEndCall={() => setActiveCall(null)} 
        />
      )}
    </div>
  );
}
