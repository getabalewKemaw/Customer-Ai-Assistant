// src/utils/jwt.js
// Updated to add optional jti for refresh tokens to ensure uniqueness
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables before using them
dotenv.config();

// Optional debug log (avoid leaking secret contents)
if (!process.env.JWT_SECRET) {
  // Fail fast to make auth errors explicit in dev
  console.error("JWT_SECRET is NOT SET. Set it in your environment or .env file.");
}
export const signToken = (payload, expiresIn = '7d', options = {}) => {
  const tokenPayload = { ...payload };
  if (options.refresh) {
    tokenPayload.jti = crypto.randomBytes(16).toString('hex'); // Unique ID for refresh tokens
  }
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

