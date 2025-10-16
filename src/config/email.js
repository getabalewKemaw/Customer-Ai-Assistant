import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Use explicit SMTP settings for better reliability in production
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use an App Password for Gmail
  },
  connectionTimeout: 20_000,
});

