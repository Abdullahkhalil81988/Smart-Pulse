const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  businessId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
