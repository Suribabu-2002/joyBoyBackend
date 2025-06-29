import express from "express";
import { getMovie, getMovies } from "../controllers/movieController.js";

const router = express.Router();

router.get("/movies", getMovies);
router.get("/movie/:id", getMovie);

export default router;
