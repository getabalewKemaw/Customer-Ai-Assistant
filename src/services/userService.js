// Simple in-memory user store for now — replace with MongoDB later.
import {User }from "../models/User.js";
const users = new Map(); // key = googleId
export const findOrCreateUser = async (profile, tokens = {}) => {
  // profile: { sub, email, name, picture }
  const googleId = profile.sub || profile.sub;
  const existing = users.get(googleId);
  if (existing) {
    // update tokens or lastSeen if needed
    existing.lastSeen = new Date();
    if (tokens.refresh_token) existing.refreshToken = tokens.refresh_token;
    users.set(googleId, existing);
    return existing;
  }

  const newUser = {
    id: googleId,
    googleId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    createdAt: new Date(),
    refreshToken: tokens.refresh_token || null,
  };
  users.set(googleId, newUser);
  return newUser;
}; 
export const findUserById = async (id) => users.get(id) || null;


export const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

export const createUser = async (userData) => {
  return User.create(userData);
};