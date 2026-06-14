const mongoose = require('mongoose');

const twitterOAuthSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  codeVerifier: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['project', 'user'], 
    required: true 
  },
  source: String,
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // expires in 5 min
});

module.exports = mongoose.model('TwitterOAuth', twitterOAuthSchema);
