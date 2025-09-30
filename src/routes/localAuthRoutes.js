import express from "express";
import { signup, login, logoutLocal } from "../controllers/localAuthController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { me } from "../controllers/authController.js"; // reuse "me" endpoint


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logoutLocal);
router.get("/me", requireAuth, me);

export default router;

