import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import localAuthRoutes from "./routes/localAuthRoutes.js";
import SessionRoutes from './routes/SessionRoutes.js'
import connectDB from "./config/db.js";
import ticketRoutes from "./routes/ticketRoutes.js";

import { refresh } from './controllers/tokenControllers.js';
import { requestLogger } from "./utils/logger.js";
dotenv.config();
connectDB();
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/auth-local", localAuthRoutes);
app.post('/auth/refresh', refresh); // This was missing, causing 404
app.use("session",SessionRoutes);
// Routes for the ticket 
app.use("/api", ticketRoutes);





app.use(errorHandler);
const PORT = process.env.PORT || 3000;
app.get("/",(req,res)=>{
  res.send("Ai bot is running ");
});
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  
});
export default app;


