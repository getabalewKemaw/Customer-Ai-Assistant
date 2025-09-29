//sign/and jwt utility functions
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.JWT_SECRET;
const EXPIRES = "7d";

export const signToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

