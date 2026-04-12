import express from "express";
import { syncMovies } from "../controllers/schedulerController.js";

const router = express.Router();

router.post("/internal/sync-movies", syncMovies);
router.get("/internal/sync-movies", syncMovies);

export default router;
