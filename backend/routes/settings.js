const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Update Profile Settings
router.put('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    const { username, name, bio, website, gender, birthday } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username) user.username = username;
    if (name) user.name = name;
    if (bio) user.bio = bio;
    
    // Using a generic settings object to store extra profile fields for now 
    // to avoid massive schema migrations in this step.
    if (!user.settings) user.settings = {};
    if (!user.settings.profile) user.settings.profile = {};
    
    if (website) user.settings.profile.website = website;
    if (gender) user.settings.profile.gender = gender;
    if (birthday) user.settings.profile.birthday = birthday;

    if (req.file) {
      user.profilePicture = req.file.path;
    }

    // Tell mongoose settings object changed
    user.markModified('settings');
    
    await user.save();
    
    // We don't want to send back the password
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Account Privacy Settings
router.put('/privacy', authMiddleware, async (req, res) => {
  try {
    const { 
      isPrivate, 
      whoCanMessage, 
      whoCanCall, 
      hideOnlineStatus, 
      hideLastSeen,
      storyPrivacy,
      commentControls,
      tagMentionControls
    } = req.body;
    
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.settings) user.settings = {};
    if (!user.settings.privacy) user.settings.privacy = {};
    
    if (isPrivate !== undefined) user.settings.privacy.isPrivate = isPrivate;
    if (whoCanMessage !== undefined) user.settings.privacy.whoCanMessage = whoCanMessage;
    if (whoCanCall !== undefined) user.settings.privacy.whoCanCall = whoCanCall;
    if (hideOnlineStatus !== undefined) user.settings.privacy.hideOnlineStatus = hideOnlineStatus;
    if (hideLastSeen !== undefined) user.settings.privacy.hideLastSeen = hideLastSeen;
    if (storyPrivacy !== undefined) user.settings.privacy.storyPrivacy = storyPrivacy;
    if (commentControls !== undefined) user.settings.privacy.commentControls = commentControls;
    if (tagMentionControls !== undefined) user.settings.privacy.tagMentionControls = tagMentionControls;

    user.markModified('settings');
    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change Password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
