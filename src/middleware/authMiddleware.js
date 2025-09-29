// protect routes and verify jwt tokens 
import { verifyToken } from "../utils/jwt.js";
import { isBlacklisted } from "../utils/tokenBlacklist.js";
export const requireAuth = (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return res.status(401).json({ success: false, error: "No token provided" });

    if (isBlacklisted(token)) {
      return res.status(401).json({ success: false, error: "Token is blacklisted and the token has been revoked" });
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};
