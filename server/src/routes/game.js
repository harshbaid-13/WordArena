/**
 * Game Routes
 */

import express from "express";
import { getReplay, getStats } from "../controllers/gameController.js";

const router = express.Router();

router.get("/stats", getStats);
router.get("/:id/replay", getReplay);

export default router;
