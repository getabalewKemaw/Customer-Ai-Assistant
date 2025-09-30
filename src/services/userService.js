import User from "../models/User.js"; // Corrected import (was {User } with space)

export const findOrCreateUser = async (profile, tokens = {}) => {
  // Use the model's static method for Google consistency
  const user = await User.findOrCreateByGoogle({
    googleId: profile.sub,
    email: profile.email,
    name: profile.name,
    profilePicture: profile.picture,
    emailVerified: profile.email_verified, // Assume profile has this; adjust if needed
  });

  // Update tokens or lastSeen if needed
  user.lastLogin = new Date(); // Using lastLogin from schema
  if (tokens.refresh_token) {
    // If you need to store refreshToken, add a field to schema; skipping for now
  }
  await user.save();
  return user;
};

export const findUserById = async (id) => {
  return User.findById(id);
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

export const createUser = async (userData) => {
  return User.create(userData);
};