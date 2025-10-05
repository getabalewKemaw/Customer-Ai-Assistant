
import { oauth2Client } from "../config/googleOAuth.js";
import { signToken } from "../utils/jwt.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import { findOrCreateUser, findUserById } from "../services/userService.js";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";

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

    // 1️⃣ Verify OAuth state to prevent CSRF
    if (!state || !savedState || state !== savedState) {
      return res.status(400).json({ success: false, error: "Invalid OAuth state" });
    }

    // 2️⃣ Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 3️⃣ Verify ID token from Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload(); // { sub, email, name, picture, ... }

    // 4️⃣ Create or update user in database
    const user = await findOrCreateUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }, tokens);

    // 5️⃣ Sign your own JWT for your app
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    // 6️⃣ Set JWT as HttpOnly cookie (secure & production-ready)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 7️⃣ Clear temporary OAuth state cookie
    res.clearCookie("oauth_state");

    // 8️⃣ Redirect to frontend (no token in URL)
    res.redirect(FRONTEND_URL + "/oauth-success");

    // ✅ Optional: For API clients, you could also return JSON:
    // res.json({ success: true, token, user });

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


