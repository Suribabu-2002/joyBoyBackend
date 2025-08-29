import express from "express";
import { getGenres } from "../controllers/genreController.js";
import { getActors } from "../controllers/actorsController.js";

const router = express.Router();
//genre handling
router.get("/genres", getGenres);
router.get("/actors", getActors);

export default router;
