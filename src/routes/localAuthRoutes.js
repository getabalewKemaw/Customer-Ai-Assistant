import express from "express";
import { signup, login, logoutLocal } from "../controllers/localAuthController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { me } from "../controllers/authController.js"; // reuse "me" endpoint
import { verifyEmail } from "../controllers/localAuthController.js";




const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/verify-email", verifyEmail);
router.post("/logout", logoutLocal);
export default router;

