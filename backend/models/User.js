const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  mobileNumber: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  settings: { type: mongoose.Schema.Types.Mixed, default: {} } // Explicitly define settings from Phase 12
}, { timestamps: true });

const dedupeObjectIds = (arr = []) => {
  const seen = new Set();
  return arr.filter((item) => {
    const id = String(item?._id || item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

userSchema.pre('save', function dedupeRelations() {
  this.friends = dedupeObjectIds(this.friends);
  this.followers = dedupeObjectIds(this.followers);
  this.following = dedupeObjectIds(this.following);
  this.pendingRequests = dedupeObjectIds(this.pendingRequests);
});

userSchema.index({ username: 'text', email: 'text', mobileNumber: 'text' });

module.exports = mongoose.model('User', userSchema);
