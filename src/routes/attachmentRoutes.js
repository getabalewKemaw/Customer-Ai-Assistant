import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../middleware/authMiddleware.js";
import { uploadAttachment, getAttachment } from "../controllers/attachmentController.js";

// Configure multer for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

const router = express.Router();

// Upload endpoint (file or URL)
router.post("/tickets/:id/attachments", requireAuth, upload.single("file"), uploadAttachment);
// Get metadata
router.get("/tickets/attachments/:id", requireAuth, getAttachment);
export default router;

