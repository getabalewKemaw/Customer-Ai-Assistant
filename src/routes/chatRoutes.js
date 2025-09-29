import express from "express";
import { generateText, generateFromImage } from "../controllers/chatController.js";
const router = express.Router();
router.post("/text", generateText);     // POST /api/chat/text
router.post("/image", generateFromImage); // POST /api/chat/image
export default router;
