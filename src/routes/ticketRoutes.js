import express from "express";
import {
  createTicket,
  getTicketWithMessages,
  postMessage,
  updateTicket,
} from "../controllers/ticketController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/tickets", requireAuth, createTicket);
router.get("/tickets/:id", requireAuth, getTicketWithMessages);
router.post("/tickets/:id/messages", requireAuth, postMessage);
router.patch("/tickets/:id", requireAuth, updateTicket);
export default router;
