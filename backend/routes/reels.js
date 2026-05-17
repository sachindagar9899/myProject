const express = require('express');
const Reel = require('../models/Reel');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Create a new reel
router.post('/', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    const { caption } = req.body;
    let videoUrl = '';

    if (req.file && req.file.path) {
      videoUrl = req.file.path;
    } else if (req.body.videoUrl) {
      videoUrl = req.body.videoUrl;
    } else {
      return res.status(400).json({ message: 'Video is required for a reel' });
    }

    const newReel = new Reel({
      author: req.user.id,
      caption,
      videoUrl
    });

    await newReel.save();
    await newReel.populate('author', 'username profilePicture');
    
    res.status(201).json(newReel);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reels feed (infinite scroll style, can just return random or newest for now)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const reels = await Reel.find()
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(10); // Simple pagination can be added later

    res.json(reels);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like / Unlike a reel
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    const isLiked = reel.likes.includes(req.user.id);

    if (isLiked) {
      reel.likes.pull(req.user.id);
    } else {
      reel.likes.push(req.user.id);
    }

    await reel.save();
    res.json({ message: isLiked ? 'Reel unliked' : 'Reel liked', likes: reel.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
