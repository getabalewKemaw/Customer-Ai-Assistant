// middleware/auth.js
import { verifyToken } from "../utils/jwt.js";
import { isBlacklisted } from "../utils/tokenBlacklist.js";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    if (isBlacklisted(token)) {
      return res.status(401).json({ success: false, error: "Token has been revoked" });
    }

    const payload = verifyToken(token);

    // normalize id field
    const user = await User.findById(payload.id || payload._id);
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    req.user = {
      id: user._id.toString(), // ✅ always present
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("Auth error:", {
    name: err.name,       // e.g., 'JsonWebTokenError'
    message: err.message, // e.g., 'invalid signature'
    expiredAt: err.expiredAt || 'N/A' // For expiration details
  });
  let errorMsg = "Invalid or expired token";
  if (err.name === 'TokenExpiredError') errorMsg = "Token expired";
  else if (err.name === 'JsonWebTokenError') errorMsg = "Invalid token";
  return res.status(401).json({ success: false, error: errorMsg });
    //return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
