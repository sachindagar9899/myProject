const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Create a new story
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    let mediaUrl = '';
    if (req.file && req.file.path) {
      mediaUrl = req.file.path;
    } else if (req.body.mediaUrl) {
      mediaUrl = req.body.mediaUrl;
    } else {
      return res.status(400).json({ message: 'Media is required for a story' });
    }

    const newStory = new Story({
      author: req.user.id,
      mediaUrl
    });

    await newStory.save();
    res.status(201).json(newStory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get stories from friends/following
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const targetUsers = [req.user.id, ...currentUser.friends, ...currentUser.following];

    // Fetch active stories
    const stories = await Story.find({ author: { $in: targetUsers } })
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 });

    // Group stories by author
    const groupedStories = {};
    stories.forEach(story => {
      const authorId = story.author._id.toString();
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: []
        };
      }
      groupedStories[authorId].stories.push(story);
    });

    res.json(Object.values(groupedStories));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark story as viewed
router.post('/:id/view', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.views.includes(req.user.id)) {
      story.views.push(req.user.id);
      await story.save();
    }
    
    res.json({ message: 'View recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
