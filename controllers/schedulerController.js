import { configDotenv } from "dotenv";
import connectDB from "../dataBase/dataBaseConfig.js";
import {
  closeMovieSyncResources,
  runMovieSyncJob,
} from "../services/movieSyncService.js";
import {
  shouldRunJob,
  updateJobLastRun,
  getJobLastRun,
  closeDb,
} from "../utils/jobTracker.js";

configDotenv();

const JOB_NAME = "movies-sync";
const WINDOW_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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

  // Check if job should run based on 7-day window
  const shouldRun = await shouldRunJob(JOB_NAME, WINDOW_7_DAYS_MS);

  if (!shouldRun) {
    const lastRun = await getJobLastRun(JOB_NAME);
    await closeDb();
    console.log(`Job already ran recently. Last run: ${lastRun?.toISOString()}`);
    return res.status(200).json({
      success: false,
      message: "Job already ran within the 7-day window.",
    });
  }

  try {
    await connectDB();
    const result = await runMovieSyncJob();

    // Update last run time on success
    await updateJobLastRun(JOB_NAME);

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
    await closeDb();
  }
};
