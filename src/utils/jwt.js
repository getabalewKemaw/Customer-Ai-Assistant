// src/utils/jwt.js
// Updated to add optional jti for refresh tokens to ensure uniqueness
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Add this import

import dotenv from  'dotenv'
dotenv.config();
export const signToken = (payload, expiresIn = '15m', options = {}) => {
  const tokenPayload = { ...payload };
  if (options.refresh) {
    tokenPayload.jti = crypto.randomBytes(16).toString('hex'); // Unique ID for refresh tokens
  }
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

