require("dotenv").config();

const dns = require("dns");
const dnsPromises = require("node:dns/promises");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");


dnsPromises.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { default: MongoStore } = require("connect-mongo");
require("./config/passport");


const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

app.set("trust proxy", 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'blockhub_secret_key',
  resave: true,               // force save on every request
  saveUninitialized: true,    // ensure new sessions are stored
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(cookieParser());
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set");
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://afriverseglobal.com",
    ];

    // allow server-to-server / postman / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❌ DO NOT THROW ERROR — just reject silently
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// app.options("*", cors());
// MongoDB connection
mongoose.set("strictQuery", true);

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("🟢 MongoDB connected");

    //routes

    try {

      app.use("/user_waitlist", require("./routes/waitlist"));
      app.use("/user_auth", require("./routes/auth"));
      app.use("/user_campaign", require("./routes/campaign"));
      app.use("/user_plan", require("./routes/plan"));

    }
    catch (err) {
      console.log("❌ campaign route error:", err);
    }

    //bot
    if (process.env.RUN_TELEGRAM_BOT === "true") {
      require("./bot/telegramBot");
    }
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

    console.log("PORT ENV =", process.env.PORT);

    app.get("/", (req, res) => {
      res.status(200).send("Afriverse API OK");
    });

    // Start server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })


  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });