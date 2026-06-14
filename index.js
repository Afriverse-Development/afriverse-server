require("dotenv").config();

const dns = require("dns");
const dnsPromises = require("node:dns/promises");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

dnsPromises.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

require("./config/passport");

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// =====================
// Startup Logging
// =====================
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", !!process.env.MONGO_URI);

// =====================
// Middleware
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());





app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://afriverseglobal.com",
    ],
    credentials: true,
  })
);

// =====================
// Health Check
// =====================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Afriverse API running",
  });
});

// =====================
// Routes
// =====================
app.use("/user_waitlist", require("./routes/waitlist"));
app.use("/user_auth", require("./routes/auth"));
app.use("/user_campaign", require("./routes/campaign"));
app.use("/user_plan", require("./routes/plan"));

// =====================
// Telegram Bot
// =====================
require("./bot/telegramBot");

// =====================
// Cloudinary
// =====================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const upload = multer();

// =====================
// Upload Route
// =====================
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const resourceType =
      req.file.mimetype.startsWith("video")
        ? "video"
        : req.file.mimetype.startsWith("image")
        ? "image"
        : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "nft",
        chunk_size: 6000000,
      },
      (error, result) => {
        if (error) {
          console.error(error);

          return res.status(500).json({
            error: error.message,
          });
        }

        return res.status(200).json({
          url: result.secure_url,
          id: result.public_id,
        });
      }
    );

    streamifier
      .createReadStream(req.file.buffer)
      .pipe(uploadStream);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Upload failed",
    });
  }
});

// =====================
// MongoDB
// =====================
mongoose.set("strictQuery", true);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("🟢 MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed");
    console.error(err);
  });

// =====================
// Error Handlers
// =====================
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION");
  console.error(err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION");
  console.error(err);
});

// =====================
// Start Server
// =====================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});