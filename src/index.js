import express from "express";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import localAuthRoutes from "./routes/localAuthRoutes.js";
import SessionRoutes from './routes/SessionRoutes.js'
import connectDB from "./config/db.js";
import path from 'path';
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";
import attachmentRoutes from "./routes/attachmentRoutes.js";
import { refresh } from './controllers/tokenControllers.js';
import { requestLogger } from "./utils/logger.js";
import { initAIUser } from "./init/aiUser.js";
dotenv.config(); 
connectDB();
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(cookieParser());
// trust proxy is required so Express knows it's behind a proxy and can set secure cookies correctly
app.set('trust proxy', 1);


const allowedOrigins = [
  "http://localhost:5173",       
  "https://supportlyai.vercel.app" 
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed for this origin: " + origin));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



app.use("/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/auth-local", localAuthRoutes);
app.post('/auth/refresh', refresh); 
app.use("/session",SessionRoutes);
app.use("/api", ticketRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", attachmentRoutes);
app.use(errorHandler);
const startServer = async () => {
  await initAIUser(); 
};
startServer();

const PORT = process.env.PORT || 3000;
app.get("/",(req,res)=>{
  res.send("Ai bot is running ");
});
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
export default app;




