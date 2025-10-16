import { signToken, verifyToken } from "../utils/jwt.js";
import { findUserByEmail, createUser } from "../services/userService.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import Session from '../models/Session.js';
import { transporter } from "../config/email.js";
import dotenv from 'dotenv';
dotenv.config();
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
    const accessToken = signToken({ id: user.id, email: user.email }, '1d');
    const refreshToken = signToken({ id: user.id }, '7d', { refresh: true }); // Add { refresh: true }

    const deviceInfo = JSON.stringify({ userAgent: req.headers['user-agent'], ip: req.ip });
    await Session.createSession(user.id, refreshToken, deviceInfo, REFRESH_EXPIRY_SECONDS);
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${accessToken}`;

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    };
    res.cookie('token', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_EXPIRY_SECONDS * 1000 });
    await transporter.sendMail({
      from: `"Supportlly -" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify Your Email",
      html: `<p>Hello ${user.name},</p>
             <p>Thank you for signing up! Please click the link below to verify your email:</p>
             <a href="${url}">Verify Email</a>
             <p>This link expires in 24 hours.</p>
             p>Supportlly-Team[GK].</p>`,
    });
    res.status(201).json({ success: true, 
      message: "Signup successful! Please check your email to verify your account.",
      user: { id: user.id, email: user.email, name: user.name,role:user.role }, accessToken, refreshToken });
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
    const accessToken = signToken({ id: user.id, email: user.email }, '7d');
    const refreshToken = signToken({ id: user.id }, '7d', { refresh: true }); // Add { refresh: true }

    const deviceInfo = JSON.stringify({ userAgent: req.headers['user-agent'], ip: req.ip });
    await Session.createSession(user.id, refreshToken, deviceInfo, REFRESH_EXPIRY_SECONDS);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    };
    res.cookie('token', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: REFRESH_EXPIRY_SECONDS * 1000 });

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name,role:user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};
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

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token is missing");

    const payload = verifyToken(token);
    const user = await findUserByEmail(payload.email);
    if (!user) return res.status(404).send("User not found");

    if (user.isVerified) {
      return res.json({ success: true, message: "Email already verified" });
    }
    user.isVerified = true; 
    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });  } catch (err) {
    res.status(400).send("Invalid or expired token");
  }
};
export const me = async (req, res) => {
  try {
    const id = req.user?.id; // decoded from JWT in cookie by middleware
    if (!id) return res.status(401).json({ success: false, error: "Not authenticated" });

    const user = await findUserById(id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



