const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Get unread message counts
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const unreadMessages = await Message.find({
      receiver: currentUserId,
      isRead: { $ne: true }
    });

    const totalUnread = unreadMessages.length;
    
    // Group by sender
    const unreadBySender = {};
    unreadMessages.forEach(msg => {
      const senderId = msg.sender.toString();
      unreadBySender[senderId] = (unreadBySender[senderId] || 0) + 1;
    });

    res.json({ total: totalUnread, bySender: unreadBySender });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get conversation with a specific user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if friends (optional strict validation, but good for privacy)
    const currentUser = await User.findById(currentUserId);
    if (!currentUser.friends.includes(userId)) {
      // return res.status(403).json({ message: 'Can only message friends' });
      // We'll allow it for now to test, or we can uncomment to restrict.
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Mark incoming messages as read when chat is opened
    const readResult = await Message.updateMany(
      { sender: userId, receiver: currentUserId, isRead: { $ne: true } },
      { $set: { isRead: true, status: 'seen' } }
    );

    if (readResult.modifiedCount > 0) {
      const io = req.app.get('io');
      if (io) {
        const seenMessages = await Message.find({
          sender: userId,
          receiver: currentUserId,
          status: 'seen'
        }).sort({ updatedAt: -1 }).limit(readResult.modifiedCount);

        seenMessages.forEach((msg) => {
          io.to(String(userId)).emit('message_status', {
            messageId: msg._id,
            status: 'seen'
          });
        });

        io.to(String(userId)).emit('messages_seen', { by: currentUserId, count: readResult.modifiedCount });

        const unreadMessages = await Message.find({
          receiver: currentUserId,
          isRead: { $ne: true }
        });
        const bySender = {};
        unreadMessages.forEach((msg) => {
          const senderId = msg.sender.toString();
          bySender[senderId] = (bySender[senderId] || 0) + 1;
        });
        io.to(String(currentUserId)).emit('unread_update', {
          total: unreadMessages.length,
          bySender
        });
      }
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload media for chat
router.post('/upload', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    // Return the Cloudinary URL so the frontend can emit it via Socket.io
    res.json({ mediaUrl: req.file.path });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Mark conversation as read without fetching full history
router.put('/read/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const readResult = await Message.updateMany(
      { sender: userId, receiver: currentUserId, isRead: { $ne: true } },
      { $set: { isRead: true, status: 'seen' } }
    );

    const io = req.app.get('io');
    if (io && readResult.modifiedCount > 0) {
      const seenMessages = await Message.find({
        sender: userId,
        receiver: currentUserId,
        status: 'seen'
      }).sort({ updatedAt: -1 }).limit(readResult.modifiedCount);

      seenMessages.forEach((msg) => {
        io.to(String(userId)).emit('message_status', {
          messageId: msg._id,
          status: 'seen'
        });
      });

      io.to(String(userId)).emit('messages_seen', { by: currentUserId });
    }

    const unreadMessages = await Message.find({
      receiver: currentUserId,
      isRead: { $ne: true }
    });
    const bySender = {};
    unreadMessages.forEach((msg) => {
      const senderId = msg.sender.toString();
      bySender[senderId] = (bySender[senderId] || 0) + 1;
    });

    if (io) {
      io.to(String(currentUserId)).emit('unread_update', {
        total: unreadMessages.length,
        bySender
      });
    }

    res.json({ marked: readResult.modifiedCount, total: unreadMessages.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
