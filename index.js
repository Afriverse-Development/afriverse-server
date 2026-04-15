require("dotenv").config();

const dns = require("dns");
const dnsPromises = require("node:dns/promises");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");


dnsPromises.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");





const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MongoDB connection
mongoose.set("strictQuery", true);

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("🟢 MongoDB connected");

    //routes
    app.use("/user_waitlist", require("./routes/waitlist"));
    app.use("/user_auth", require("./routes/auth"));
    app.use("/user_campaign", require("./routes/campaign"));
    app.use("/user_plan", require("./routes/plan"));

    //bot
    require("./bot/telegramBot.js"); // just import it, no need to assign

    //upload nft



    const multer = require('multer');
    const cloudinary = require('cloudinary').v2;
    const streamifier = require('streamifier');

    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.API_KEY,
      api_secret: process.env.API_SECRET
    });


    const upload = multer();


    app.post('/upload', upload.single('file'), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const resourceType = req.file.mimetype.startsWith("video")
          ? "video"
          : req.file.mimetype.startsWith("image")
            ? "image"
            : "raw";

        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: resourceType, folder: 'nft', chunk_size: 6000000 },
          (error, result) => {
            if (error) return res.status(500).json({ error: error.message });

            res.status(200).json({
              url: result.secure_url,
              id: result.public_id,
            });
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
      }
    });



    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });