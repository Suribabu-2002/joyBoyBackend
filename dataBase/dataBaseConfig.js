import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2";

const connectDB = async () => {
  const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Surya2002@mySQL",
    database: "sakila",
  });
  db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err.stack);
    }
    console.log("Connected to MySQL!");
  });
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
  return db;
};

export default connectDB;
