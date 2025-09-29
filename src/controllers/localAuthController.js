// src/controllers/localAuthController.js
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt.js";
import { findUserByEmail, createUser } from "../services/userService.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";

// Signup with email + password
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered please login" });
    }
     const salt =await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);

    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await createUser({ email, password: hashedPassword, name });

    const token = signToken({ id: user.id, email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name ,token:token} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Login with email + password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);


    if (!user) {
      return res.status(401).json({ success: false, error: "user not found" });
    }

    // ✅ use the instance method
      const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }
    console.log(email,password);

    const token = signToken({ id: user.id, email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name ,token:token} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// Logout (revoke token)
export const logoutLocal = (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    addToBlacklist(token);
  }
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
};


