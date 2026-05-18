import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Video, Info, MessageCircle, Paperclip } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useMessageStore from '../store/useMessageStore';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoCallModal from '../components/VideoCallModal';

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || value);
};

const MessageStatus = ({ status }) => {
  if (status === 'seen') {
    return <span className="text-[10px] text-blue-400 font-medium">✓✓ Seen</span>;
  }
  if (status === 'delivered') {
    return <span className="text-[10px] text-gray-400 font-medium">✓✓ Delivered</span>;
  }
  return <span className="text-[10px] text-gray-500 font-medium">✓ Sent</span>;
};

const MessagesPage = () => {
  const { user, token } = useAuthStore();
  const { unreadBySender, fetchUnread, getSocket, initSocket, clearSenderUnread } = useMessageStore();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState(null);
  const fileInputRef = useRef(null);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const userIdFromQuery = queryParams.get('user');

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);

  const [onlineStatuses, setOnlineStatuses] = useState({});
  const messagesEndRef = useRef(null);
  const selectedFriendRef = useRef(null);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  const markConversationRead = useCallback((friendId) => {
    if (!friendId || !user?.id) return;
    clearSenderUnread(friendId);
    if (socket) {
      socket.emit('mark_conversation_read', { friendId: String(friendId) });
    }
    fetchUnread(token);
  }, [socket, user?.id, token, fetchUnread, clearSenderUnread]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/users/${user?.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(res.data.friends || []);
      } catch (err) {
        console.error('Failed to fetch friends', err);
      }
    };
    if (user && token) fetchFriends();
  }, [user, token]);

  useEffect(() => {
    if (userIdFromQuery && token) {
      const fetchTargetUser = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/users/${userIdFromQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSelectedFriend(res.data);
          setFriends((prev) => {
            if (!prev.some((f) => f._id === res.data._id)) {
              return [res.data, ...prev];
            }
            return prev;
          });
        } catch (err) {
          console.error('Failed to fetch target user', err);
        }
      };
      fetchTargetUser();
    }
  }, [userIdFromQuery, token]);

  useEffect(() => {
    if (!user?.id || !token) return;

    const sharedSocket = getSocket() || initSocket(user.id, token);
    setSocket(sharedSocket);
    if (!sharedSocket) return;

    sharedSocket.emit('join_room', String(user.id));

    const onReceiveMessage = (msg) => {
      const senderId = getId(msg.sender);
      const receiverId = getId(msg.receiver);
      const myId = getId(user.id);
      const activeFriend = selectedFriendRef.current;

      if (
        activeFriend &&
        receiverId === myId &&
        senderId === getId(activeFriend._id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => getId(m._id) === getId(msg._id))) return prev;
          return [...prev, msg];
        });
        markConversationRead(senderId);
      }

      fetchUnread(token);
    };

    const onMessageSent = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => getId(m._id) === getId(msg._id))) return prev;
        return [...prev, { ...msg, status: msg.status || 'sent' }];
      });
    };

    const onMessageStatus = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          getId(m._id) === getId(messageId) ? { ...m, status } : m
        )
      );
    };

    const onMessagesSeen = ({ by }) => {
      const readerId = getId(by);
      setMessages((prev) =>
        prev.map((m) =>
          getId(m.sender) === getId(user.id) && getId(m.receiver) === readerId
            ? { ...m, status: 'seen', isRead: true }
            : m
        )
      );
    };

    const onCallUser = (data) => {
      setIncomingCall({
        from: data.from,
        name: data.name,
        signal: data.signal
      });
      setShowVideoModal(true);
      setIsInitiator(false);
    };

    const onUserStatus = (data) => {
      setOnlineStatuses((prev) => ({
        ...prev,
        [data.userId]: data.status === 'online'
      }));
    };

    sharedSocket.on('receive_message', onReceiveMessage);
    sharedSocket.on('message_sent', onMessageSent);
    sharedSocket.on('message_status', onMessageStatus);
    sharedSocket.on('messages_seen', onMessagesSeen);
    sharedSocket.on('callUser', onCallUser);
    sharedSocket.on('user_status', onUserStatus);

    return () => {
      sharedSocket.off('receive_message', onReceiveMessage);
      sharedSocket.off('message_sent', onMessageSent);
      sharedSocket.off('message_status', onMessageStatus);
      sharedSocket.off('messages_seen', onMessagesSeen);
      sharedSocket.off('callUser', onCallUser);
      sharedSocket.off('user_status', onUserStatus);
    };
  }, [user?.id, token, initSocket, getSocket, fetchUnread, markConversationRead]);

  const startVideoCall = () => {
    if (!selectedFriend) return;
    setIsInitiator(true);
    setIncomingCall(null);
    setShowVideoModal(true);
  };

  useEffect(() => {
    if (selectedFriend && socket) {
      socket.emit('check_online_status', String(selectedFriend._id));
      markConversationRead(selectedFriend._id);
    }
  }, [selectedFriend, socket, markConversationRead]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedFriend) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/messages/${selectedFriend._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data);
        clearSenderUnread(selectedFriend._id);
        fetchUnread(token);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };
    fetchHistory();
  }, [selectedFriend, token, fetchUnread, clearSenderUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || !selectedFriend || !socket) return;

    let mediaUrl = null;

    if (attachment) {
      setUploading(true);
      const formData = new FormData();
      formData.append('media', attachment);
      try {
        const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/messages/upload`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        mediaUrl = res.data.mediaUrl;
      } catch (err) {
        console.error('Failed to upload attachment', err);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    socket.emit('send_message', {
      sender: user.id,
      receiver: selectedFriend._id,
      content: input,
      mediaUrl
    });
    setInput('');
    setAttachment(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend(e);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setAttachment(e.target.files[0]);
  };

  return (
    <div className="flex h-full max-h-[calc(100vh-80px)] md:max-h-screen">
      <div className={`w-full md:w-1/3 border-r border-[#ffffff1a] flex flex-col ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#ffffff1a]">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {friends.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No friends to chat with yet.</p>
          )}
          {friends.map((friend) => {
            const friendUnread = unreadBySender[String(friend._id)] || 0;
            return (
              <div
                key={friend._id}
                onClick={() => setSelectedFriend(friend)}
                className={`flex items-center space-x-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 ${selectedFriend?._id === friend._id ? 'bg-white/5' : ''}`}
              >
                <div className="relative">
                  <img
                    src={friend.profilePicture || `https://i.pravatar.cc/150?u=${friend._id}`}
                    className="w-12 h-12 rounded-full border border-[var(--color-neon-purple)]"
                    alt="Avatar"
                  />
                  {friendUnread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-black">
                      {friendUnread > 99 ? '99+' : friendUnread}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-semibold text-sm truncate">{friend.username}</h4>
                  <p className="text-xs text-gray-400 truncate">
                    {friendUnread > 0 ? `${friendUnread} new message${friendUnread > 1 ? 's' : ''}` : 'Tap to view messages'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedFriend ? (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
          <div className="p-4 border-b border-[#ffffff1a] glass-panel flex items-center justify-between sticky top-0 z-10">
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors"
              onClick={() => navigate(`/profile/${selectedFriend._id}`)}
            >
              <button
                type="button"
                className="md:hidden text-[var(--color-neon-blue)] mr-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFriend(null);
                }}
              >
                ← Back
              </button>
              <img
                src={selectedFriend.profilePicture || `https://i.pravatar.cc/150?u=${selectedFriend._id}`}
                className="w-10 h-10 rounded-full"
                alt="Avatar"
              />
              <div>
                <h3 className="font-bold">{selectedFriend.username}</h3>
                {onlineStatuses[selectedFriend._id] ? (
                  <p className="text-xs text-green-400 font-medium tracking-wide">Online</p>
                ) : (
                  <p className="text-xs text-gray-500 font-medium tracking-wide">Offline</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Video
                onClick={startVideoCall}
                className="w-5 h-5 cursor-pointer hover:text-[var(--color-neon-purple)] transition-colors"
              />
              <Info className="w-5 h-5 cursor-pointer hover:text-white text-gray-400 transition-colors" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24 md:pb-4">
            {messages.length === 0 ? (
              <div className="flex justify-center h-full items-center text-gray-500 text-sm">
                Say hi to {selectedFriend.username}!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = getId(msg.sender) === getId(user?.id);
                return (
                  <div key={msg._id || idx} className={`flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3 rounded-2xl max-w-[70%] text-sm ${isMe ? 'bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] text-white rounded-br-sm' : 'bg-[#1a1a1a] border border-[#ffffff1a] text-white rounded-bl-sm'}`}
                    >
                      {msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden max-w-[200px] md:max-w-[250px]">
                          <img
                            src={msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/${msg.mediaUrl}`}
                            alt="Attachment"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-gray-500'}`}>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                        {isMe && <MessageStatus status={msg.status || 'sent'} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 glass-panel border-t border-[#ffffff1a] fixed bottom-14 md:bottom-0 w-full md:w-auto md:relative left-0 right-0 z-20 bg-[#0a0a0a]">
            {attachment && (
              <div className="mb-2 p-2 bg-[#ffffff1a] rounded-lg flex items-center justify-between">
                <span className="text-xs text-[var(--color-neon-blue)] truncate max-w-[200px]">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} className="text-red-400 text-xs font-bold px-2">
                  X
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full bg-[#ffffff0a] hover:bg-[#ffffff1a] transition-colors"
              >
                <Paperclip className="w-5 h-5 text-gray-400 hover:text-[var(--color-neon-blue)]" />
              </button>
              <input
                type="text"
                placeholder={uploading ? 'Uploading...' : 'Message...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={uploading}
                className="flex-1 bg-[#ffffff0a] border border-[#ffffff1a] rounded-full px-4 py-2 text-sm outline-none focus:border-[var(--color-neon-purple)] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={uploading}
                className="p-2 rounded-full bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-500 h-full">
          <MessageCircle size={48} className="mb-4 opacity-50" />
          <p>Select a friend to start chatting</p>
        </div>
      )}

      {showVideoModal && socket && (
        <VideoCallModal
          socket={socket}
          currentUser={user}
          friend={selectedFriend || friends.find((f) => getId(f._id) === getId(incomingCall?.from))}
          incomingCall={incomingCall}
          isInitiator={isInitiator}
          onClose={() => {
            setShowVideoModal(false);
            setIncomingCall(null);
            setIsInitiator(false);
          }}
        />
      )}
    </div>
  );
};

export default MessagesPage;
