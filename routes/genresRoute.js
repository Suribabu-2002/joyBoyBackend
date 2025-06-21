import express from "express";
import { getGenres } from "../controllers/genreController.js";

const router = express.Router();
//genre handling
router.get("/genres", getGenres);

export default router;
