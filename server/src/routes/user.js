/**
 * User Routes
 */

import express from "express";
import {
  getLeaderboard,
  getMatches,
  getProfile,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.get("/:id/profile", getProfile);
router.get("/:id/matches", getMatches);

export default router;
