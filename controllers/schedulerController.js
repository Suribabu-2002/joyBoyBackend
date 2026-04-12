import { configDotenv } from "dotenv";
import connectDB from "../dataBase/dataBaseConfig.js";
import {
  closeMovieSyncResources,
  runMovieSyncJob,
} from "../services/movieSyncService.js";

configDotenv();

const isAuthorized = (req) => {
  const configuredSecret = process.env.CRON_SECRET?.trim();

  if (!configuredSecret) {
    return true;
  }

  const bearerToken = req.headers.authorization?.replace("Bearer ", "").trim();
  const headerToken = req.headers["x-cron-secret"]?.trim();

  return bearerToken === configuredSecret || headerToken === configuredSecret;
};

export const syncMovies = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ message: "Unauthorized cron request." });
  }

  try {
    await connectDB();
    const result = await runMovieSyncJob();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Movie sync endpoint failed:", error);

    return res.status(500).json({
      success: false,
      message: "Movie sync failed.",
      error: error.message,
    });
  } finally {
    await closeMovieSyncResources();
  }
};
