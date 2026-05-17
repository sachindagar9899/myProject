const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Create a new post
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { content } = req.body;
    let mediaUrl = '';

    if (req.file && req.file.path) {
      mediaUrl = req.file.path;
    } else if (req.body.mediaUrl) { // Fallback if no file uploaded but URL provided
      mediaUrl = req.body.mediaUrl;
    }

    const newPost = new Post({
      author: req.user.id,
      content,
      mediaUrl
    });

    await newPost.save();
    
    // Populate author before returning
    await newPost.populate('author', 'username profilePicture');

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Feed (Posts by user, friends, and following)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Users to fetch posts from
    const targetUsers = [
      req.user.id,
      ...currentUser.friends,
      ...currentUser.following
    ];

    const posts = await Post.find({ author: { $in: targetUsers } })
      .populate('author', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 }) // Newest first
      .limit(50); // Optional pagination limit

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get posts by a specific user
router.get('/user/:id', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like / Unlike a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isLiked = post.likes.includes(req.user.id);

    if (isLiked) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ message: isLiked ? 'Post unliked' : 'Post liked', likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Comment on a post
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    post.comments.push({
      user: req.user.id,
      text
    });

    await post.save();
    
    // Repopulate to return with user data
    await post.populate('comments.user', 'username profilePicture');
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
