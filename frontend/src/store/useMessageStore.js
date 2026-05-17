import { create } from 'zustand';
import { io } from 'socket.io-client';
import axios from 'axios';

let socketInstance = null;

const useMessageStore = create((set, get) => ({
  unreadCount: 0,
  unreadBySender: {},
  socket: null,

  fetchUnread: async (token) => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/messages/unread', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        unreadCount: res.data.total || 0,
        unreadBySender: res.data.bySender || {}
      });
    } catch (err) {
      console.error('Failed to fetch unread messages', err);
    }
  },

  initSocket: (userId, token) => {
    if (!userId || !token) return null;

    if (socketInstance?.connected) {
      set({ socket: socketInstance });
      get().fetchUnread(token);
      return socketInstance;
    }

    const socket = io('http://localhost:5000', { autoConnect: true });
    socketInstance = socket;

    socket.emit('join_room', String(userId));

    socket.on('unread_update', ({ total, bySender }) => {
      const count = total ?? 0;
      set({
        unreadCount: count,
        unreadBySender: count === 0 ? {} : (bySender || {})
      });
    });

    socket.on('receive_message', () => {
      get().fetchUnread(token);
    });

    set({ socket });
    get().fetchUnread(token);

    return socket;
  },

  clearSenderUnread: (senderId) => {
    const id = String(senderId);
    const { unreadBySender, unreadCount } = get();
    const removed = unreadBySender[id] || 0;
    if (!removed) return;
    const next = { ...unreadBySender };
    delete next[id];
    set({
      unreadBySender: next,
      unreadCount: Math.max(0, unreadCount - removed)
    });
  },

  getSocket: () => socketInstance,

  disconnectSocket: () => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    set({ socket: null, unreadCount: 0, unreadBySender: {} });
  }
}));

export default useMessageStore;
