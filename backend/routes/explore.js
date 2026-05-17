const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Get Explore Feed (Random or trending posts from people you don't follow)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // We want to fetch posts from users we are NOT following, to explore new content
    // For simplicity right now, we'll just fetch recent posts with high likes or randomly
    
    const excludeUsers = [req.user.id, ...currentUser.following, ...currentUser.friends];

    const explorePosts = await Post.find({ author: { $nin: excludeUsers } })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(30);

    // If there aren't enough posts from non-followed users, fallback to general recent posts
    if (explorePosts.length < 10) {
      const morePosts = await Post.find()
        .populate('author', 'username profilePicture')
        .sort({ likes: -1, createdAt: -1 })
        .limit(30);
      return res.json(morePosts);
    }

    res.json(explorePosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Advanced Search (Users and Hashtags)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [], posts: [] });

    // Search users by username or bio
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    }).select('username profilePicture bio').limit(10);

    // Search posts by content (hashtags/text)
    const posts = await Post.find({
      content: { $regex: q, $options: 'i' }
    }).populate('author', 'username profilePicture').limit(20);

    res.json({ users, posts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
