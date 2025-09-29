// the routes for the oauth flow  and all the auth endpoints
import express from "express";
import { redirectToGoogle, googleCallback, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/google", redirectToGoogle);               // redirect user to Google
router.get("/google/callback", googleCallback);        // Google will redirect here
router.get("/me", requireAuth, me);                    // get current user
router.post("/logout", logout);

export default router;

