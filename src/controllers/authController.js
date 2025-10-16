
import { oauth2Client } from "../config/googleOAuth.js";
import { signToken } from "../utils/jwt.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import { findOrCreateUser, findUserById } from "../services/userService.js";
import  Session  from "../models/Session.js";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
//const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const REFRESH_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
// 1) Redirect user to Google consent screen (GET /auth/google)
export const redirectToGoogle = (req, res) => {
  // generate a random state to protect against CSRF attacks
  const state = crypto.randomBytes(16).toString("hex");
  // store in an HttpOnly cookie for validation during callback
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax" });

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // ask for refresh token (refresh token only given on first consent)
    prompt: "consent",     // force consent so we receive refresh_token (if not previously granted)
    scope: ["openid", "profile", "email"],
    state,
  });

  // redirect the user to Google's OAuth 2.0 consent screen
  res.redirect(url);
};

// 2) Callback (GET /auth/google/callback?code=...&state=...)
export const googleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies?.oauth_state;

    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({ success: false, error: "Invalid OAuth state" });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Create or update user
    const user = await findOrCreateUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }, tokens);

    // Create app tokens
    const accessToken = signToken({ id: user.id, email: user.email, name: user.name }, "15m");
    const refreshToken = signToken({ id: user.id }, "7d", { refresh: true });

    // Store refresh token in DB
    const deviceInfo = JSON.stringify({ userAgent: req.headers['user-agent'], ip: req.ip });
    await Session.createSession(user.id, refreshToken, deviceInfo, REFRESH_EXPIRY_SECONDS);

    // Set cookies for both access and refresh tokens
    const cookieOptions = {
      httpOnly: true,
      secure: true, // required for SameSite=None on cross-site
      sameSite: "none",
      maxAge: REFRESH_EXPIRY_SECONDS * 1000,
    };
    res.cookie("token", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 min
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // Clear OAuth state cookie
    res.clearCookie("oauth_state");

    // Redirect frontend
    res.redirect(FRONTEND_URL + "/oauth-success");

  } catch (err) {
    next(err);
  }
};
// 3) For API clients: return current user from JWT cookie or Authorization header
export const me = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ success: false, error: "Not authenticated" });
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4) Logout clears cookie
export const logout = (req, res) => {
     const token = req.cookies?.token;
  if (token) {
    addToBlacklist(token); // revoke the token
  }

  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
};


