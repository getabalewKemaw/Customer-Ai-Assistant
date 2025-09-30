// src/models/Session.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
  },
  deviceInfo: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '0s' },
  },
}, { timestamps: true });

/**
 * Hash helper
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Create new session
 */
sessionSchema.statics.createSession = async function (userId, refreshToken, deviceInfo, expirySeconds) {
  return this.create({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    deviceInfo,
    expiresAt: new Date(Date.now() + expirySeconds * 1000),
  });
};

/**
 * Rotate refresh token by replacing old session with new one
 */
sessionSchema.methods.rotateRefreshToken = async function (newRefreshToken, expirySeconds = 7 * 24 * 60 * 60) {
  this.refreshTokenHash = hashToken(newRefreshToken);
  this.expiresAt = new Date(Date.now() + expirySeconds * 1000);
  await this.save();
};

/**
 * Validate refresh token
 */
sessionSchema.statics.validateRefreshToken = async function (refreshToken, userId) {
  return this.findOne({
    refreshTokenHash: hashToken(refreshToken),
    userId,
    expiresAt: { $gt: new Date() }, // reject expired sessions
  });
};

const Session = mongoose.model('Session', sessionSchema);
export default Session;
