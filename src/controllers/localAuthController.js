// src/controllers/localAuthController.js
// Update refreshToken generation to use { refresh: true }
import { signToken, verifyToken } from "../utils/jwt.js";
import { findUserByEmail, createUser } from "../services/userService.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import Session from '../models/Session.js';

const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered please login" });
    }

    const user = await createUser({ email, password, name, authMethods: ['email'] });

    const accessToken = signToken({ id: user.id, email: user.email }, '15m');
    const refreshToken = signToken({ id: user.id }, '7d', { refresh: true }); // Add { refresh: true }

    const deviceInfo = JSON.stringify({ userAgent: req.headers['user-agent'], ip: req.ip });
    await Session.createSession(user.id, refreshToken, deviceInfo, REFRESH_EXPIRY_SECONDS);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    };
    res.cookie('token', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_EXPIRY_SECONDS * 1000 });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const accessToken = signToken({ id: user.id, email: user.email }, '15m');
    const refreshToken = signToken({ id: user.id }, '7d', { refresh: true }); // Add { refresh: true }

    const deviceInfo = JSON.stringify({ userAgent: req.headers['user-agent'], ip: req.ip });
    await Session.createSession(user.id, refreshToken, deviceInfo, REFRESH_EXPIRY_SECONDS);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    };
    res.cookie('token', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_EXPIRY_SECONDS * 1000 });

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

// Logout remains the same
export const logoutLocal = async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    addToBlacklist(token);
  }
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const decoded = verifyToken(refreshToken);
      const session = await Session.validateRefreshToken(refreshToken, decoded.id);
      if (session) await session.remove();
    } catch {} // Silent fail
  }
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out' });
};