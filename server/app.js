const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from Vite build
const distPath = path.join(__dirname, "../vite-project/dist");
app.use(express.static(distPath, { maxAge: "1d" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || 100),
  message: "Too many requests from this IP, please try again later.",
});

// Apply rate limiting to all routes
app.use(limiter);

// Speed limiting
const speedLimiter = slowDown({
  windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS || 900000), // 15 minutes
  delayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER || 50),
  delayMs: () => parseInt(process.env.SLOW_DOWN_DELAY_MS || 500)
});

// Apply speed limiting to all routes
app.use(speedLimiter);

// Utility function for retrying axios requests
const retryAxios = async (config, retries = 3, backoff = 300) => {
  try {
    return await axios(config);
  } catch (error) {
    if (retries === 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return retryAxios(config, retries - 1, backoff * 2);
  }
};

// Example route that uses retryAxios
app.get("/api/data", async (req, res) => {
  try {
    const response = await retryAxios({
      method: "get",
      url: "https://api.example.com/data",
      timeout: parseInt(process.env.API_TIMEOUT || 30000),
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// SPA fallback - return index.html for all unknown routes (for React routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).json({ error: "Not found" });
    }
  });
});

module.exports = app;
