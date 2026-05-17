require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/antigravity')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => console.log('MongoDB connection error:', err));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const exploreRoutes = require('./routes/explore');
const storyRoutes = require('./routes/stories');
const reelRoutes = require('./routes/reels');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/settings', settingsRoutes);

// Basic Routes Placeholder
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AntiGravity API is running' });
});

const Message = require('./models/Message');

async function getUnreadStats(receiverId) {
  const unreadMessages = await Message.find({
    receiver: receiverId,
    isRead: { $ne: true }
  });
  const bySender = {};
  unreadMessages.forEach((msg) => {
    const senderId = msg.sender.toString();
    bySender[senderId] = (bySender[senderId] || 0) + 1;
  });
  return { total: unreadMessages.length, bySender };
}

function emitUnreadUpdate(receiverId) {
  return getUnreadStats(receiverId).then((stats) => {
    io.to(String(receiverId)).emit('unread_update', stats);
  });
}

// Socket.io integration
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (userId) => {
    const roomId = String(userId);
    socket.join(roomId);
    onlineUsers.set(roomId, socket.id);
    socket.userId = roomId;
    io.emit('user_status', { userId: roomId, status: 'online' });
    console.log(`User ${userId} joined their personal room`);
  });

  socket.on('check_online_status', (userId) => {
    const id = String(userId);
    const isOnline = onlineUsers.has(id);
    socket.emit('user_status', { userId: id, status: isOnline ? 'online' : 'offline' });
  });

  socket.on('send_message', async (data) => {
    try {
      const { sender, receiver, content, mediaUrl } = data;
      const receiverId = String(receiver);
      const senderId = String(sender);
      const receiverOnline = onlineUsers.has(receiverId);

      const newMessage = new Message({
        sender,
        receiver,
        content,
        mediaUrl,
        status: receiverOnline ? 'delivered' : 'sent'
      });
      await newMessage.save();

      const payload = newMessage.toObject();

      io.to(receiverId).emit('receive_message', payload);
      await emitUnreadUpdate(receiverId);

      socket.emit('message_sent', payload);

      io.to(String(sender)).emit('message_status', {
        messageId: newMessage._id,
        status: receiverOnline ? 'delivered' : 'sent'
      });
    } catch (err) {
      console.error('Socket message error:', err);
    }
  });

  // WebRTC Signaling
  socket.on('callUser', ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit('callUser', { signal: signalData, from, name });
  });

  socket.on('answerCall', (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  });

  socket.on('iceCandidate', (data) => {
    io.to(data.to).emit('iceCandidate', data.candidate);
  });

  socket.on('endCall', ({ to }) => {
    io.to(String(to)).emit('endCall');
  });

  socket.on('mark_conversation_read', async ({ friendId }) => {
    try {
      const currentUserId = socket.userId;
      if (!currentUserId || !friendId) return;

      const unreadBefore = await Message.find({
        sender: friendId,
        receiver: currentUserId,
        isRead: { $ne: true }
      });

      if (unreadBefore.length === 0) return;

      await Message.updateMany(
        { sender: friendId, receiver: currentUserId, isRead: { $ne: true } },
        { $set: { isRead: true, status: 'seen' } }
      );

      unreadBefore.forEach((msg) => {
        io.to(String(friendId)).emit('message_status', {
          messageId: msg._id,
          status: 'seen'
        });
      });

      io.to(String(friendId)).emit('messages_seen', { by: currentUserId });
      await emitUnreadUpdate(currentUserId);
    } catch (err) {
      console.error('mark_conversation_read error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user_status', { userId: socket.userId, status: 'offline' });
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
