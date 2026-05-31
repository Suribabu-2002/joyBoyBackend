import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import connectDB from "./dataBase/dataBaseConfig.js";
import { runMovieSyncJob } from "./services/movieSyncService.js";
import {
  getJobLastRun,
  updateJobLastRun,
  shouldRunJob,
  closeDb,
} from "./utils/jobTracker.js";

configDotenv();

const JOB_NAME = "movies-sync";
const WINDOW_7_DAYS_MS = 1 * 1 * 5 * 60 * 1000;

const executeMovieSync = async () => {
  try {
    await connectDB();
    const result = await runMovieSyncJob();
    console.log("Movie sync result:", result);

    // Update last run time on success
    await updateJobLastRun(JOB_NAME);
    console.log("Updated job last run timestamp.");

    return result;
  } catch (error) {
    console.error("Movie sync failed:", error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

export const startMovieSyncCron = async () => {
  const runningOnVercel = Boolean(process.env.VERCEL);

  if (runningOnVercel) {
    console.log("Running on Vercel - checking if job should run based on 7-day window.");
  } else {
    console.log(
      "Running on persistent server - job runs via cron or manual invocation.",
    );
  }

  const shouldRun = await shouldRunJob(JOB_NAME, WINDOW_7_DAYS_MS);

  if (!shouldRun) {
    const lastRun = await getJobLastRun(JOB_NAME);
    console.log(`Job already ran recently. Last run: ${lastRun?.toISOString()}`);
    await closeDb();
    return null;
  }

  console.log("Running movie sync job...");
  const result = await executeMovieSync();
  await closeDb();
  return result;
};

const isDirectExecution = process.argv[1]?.endsWith("scheduler.js");

if (isDirectExecution) {
  await startMovieSyncCron();
}
