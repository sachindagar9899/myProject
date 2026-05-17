const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

const toId = (id) => String(id?._id || id);

const listHas = (arr, userId) =>
  (arr || []).some((item) => toId(item) === toId(userId));

// Search users (Phase 2)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user.id }
    }).select('username profilePicture bio');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Profile with Cloudinary Image Upload (Phase 1)
router.put('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    const { bio } = req.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (req.file && req.file.path) updateData.profilePicture = req.file.path;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile (Phase 2)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture')
      .populate('friends', 'username profilePicture')
      .populate('pendingRequests', 'username profilePicture');
      
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean duplicate entries in DB if any exist from older data
    const needsSave =
      user.friends.length !== new Set(user.friends.map(toId)).size ||
      user.pendingRequests.length !== new Set(user.pendingRequests.map(toId)).size;

    if (needsSave) {
      user.friends = [...new Map(user.friends.map((f) => [toId(f), f])).values()];
      user.pendingRequests = [...new Map(user.pendingRequests.map((p) => [toId(p), p])).values()];
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Follow/Unfollow user (Phase 2)
router.post('/follow/:id', authMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);
    
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    
    const isFollowing = currentUser.following.includes(req.params.id);
    
    if (isFollowing) {
      currentUser.following.pull(req.params.id);
      targetUser.followers.pull(req.user.id);
    } else {
      currentUser.following.push(req.params.id);
      targetUser.followers.push(req.user.id);
    }
    
    await currentUser.save();
    await targetUser.save();
    
    res.json({ message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send Friend Request (Phase 2)
router.post('/friend-request/:id', authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentUserId = req.user.id;

    if (toId(targetId) === toId(currentUserId)) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    const [targetUser, currentUser] = await Promise.all([
      User.findById(targetId),
      User.findById(currentUserId)
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (listHas(targetUser.friends, currentUserId) || listHas(currentUser.friends, targetId)) {
      return res.status(400).json({ message: 'You are already friends' });
    }

    if (listHas(targetUser.pendingRequests, currentUserId)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    if (listHas(currentUser.pendingRequests, targetId)) {
      return res.status(400).json({
        message: 'This user already sent you a request. Accept it from Notifications.'
      });
    }

    await User.findByIdAndUpdate(targetId, {
      $addToSet: { pendingRequests: currentUserId }
    });

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept/Reject Friend Request (Phase 2)
router.post('/friend-request/:id/:action', authMiddleware, async (req, res) => {
  try {
    const { action } = req.params; // 'accept' or 'reject'
    const currentUserId = req.user.id;
    const requesterId = req.params.id;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    if (!listHas(currentUser.pendingRequests, requesterId)) {
      return res.status(400).json({ message: 'No pending request from this user' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { pendingRequests: requesterId }
    });

    if (action === 'accept') {
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { friends: requesterId }
      });

      await User.findByIdAndUpdate(requesterId, {
        $addToSet: { friends: currentUserId },
        $pull: { pendingRequests: currentUserId }
      });
    }

    res.json({ message: `Friend request ${action}ed` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
