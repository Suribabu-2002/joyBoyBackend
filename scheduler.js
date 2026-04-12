import { configDotenv } from "dotenv";
import cron from "node-cron";
import mongoose from "mongoose";
import connectDB from "./dataBase/dataBaseConfig.js";
import { runMovieSyncJob } from "./services/movieSyncService.js";

configDotenv();

const FIFTEEN_DAY_CRON = "0 0 */15 * *";

const shouldStartCron = () => {
  const enabled = process.env.ENABLE_MOVIE_SYNC_CRON === "true";
  const runningOnVercel = Boolean(process.env.VERCEL);

  return enabled && !runningOnVercel;
};

const executeMovieSync = async () => {
  try {
    await connectDB();
    const result = await runMovieSyncJob();
    console.log("Scheduled movie sync result:", result);
  } catch (error) {
    console.error("Scheduled movie sync failed:", error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

export const startMovieSyncCron = () => {
  if (!shouldStartCron()) {
    console.log(
      "Movie sync cron is disabled. Set ENABLE_MOVIE_SYNC_CRON=true on a persistent server to enable it.",
    );
    return null;
  }

  const task = cron.schedule(FIFTEEN_DAY_CRON, async () => {
    console.log("Starting scheduled movie sync job.");
    await executeMovieSync();
  });

  console.log(
    `Movie sync cron started with schedule "${FIFTEEN_DAY_CRON}" in server local time.`,
  );

  return task;
};

const isDirectExecution = process.argv[1]?.endsWith("scheduler.js");

if (isDirectExecution) {
  await executeMovieSync();
}
