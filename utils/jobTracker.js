import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

const DB_DIR = path.resolve(".scheduler");
const DB_FILE = path.resolve(DB_DIR, "jobs.db");

// Ensure .scheduler directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db = null;

const getDb = async () => {
  if (db) return db;

  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  // Create jobs table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      last_run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
};

export const getJobLastRun = async (jobName) => {
  const db = await getDb();
  const row = await db.get(
    "SELECT last_run_at FROM jobs WHERE name = ?",
    jobName,
  );
  return row?.last_run_at ? new Date(row.last_run_at) : null;
};

export const updateJobLastRun = async (jobName) => {
  const db = await getDb();
  await db.run(
    `INSERT INTO jobs (name, last_run_at)
     VALUES (?, CURRENT_TIMESTAMP)
     ON CONFLICT(name) DO UPDATE SET last_run_at = CURRENT_TIMESTAMP`,
    jobName,
  );
};

export const shouldRunJob = async (jobName, windowMs) => {
  const lastRun = await getJobLastRun(jobName);
  if (!lastRun) return true;

  const now = new Date();
  const diffMs = now - lastRun;
  return diffMs >= windowMs;
};

export const closeDb = async () => {
  if (db) {
    await db.close();
    db = null;
  }
};
