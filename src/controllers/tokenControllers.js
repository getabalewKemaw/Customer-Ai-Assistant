
import { signToken, verifyToken } from '../utils/jwt.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token provided' });
    }

    // Verify token signature
    const decoded = verifyToken(refreshToken);

    // Validate refresh token in DB
    const session = await Session.validateRefreshToken(refreshToken, decoded.id);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    // Fetch user
    const user = await User.findById(decoded.id);
    if (!user) {
      await session.remove();
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = signToken({ id: user.id, email: user.email }, '15m');
    const newRefreshToken = signToken({ id: user.id }, '7d', { refresh: true });

    // Update session in DB
    await session.rotateRefreshToken(newRefreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie('token', newAccessToken, cookieOptions);
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: "No refresh token provided" });
    }

    const decoded = verifyToken(refreshToken);
    const session = await Session.validateRefreshToken(refreshToken, decoded.id);

    if (session) {
      await session.remove();
      return res.json({ success: true, message: "Session revoked" });
    }

    return res.status(404).json({ success: false, error: "Session not found" });
  } catch (err) {
    next(err);
  }
};



