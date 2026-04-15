// routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('cloudinary').v2;

const uploadCloud = multer(); // for memory storage (buffer)

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET


router.post("/register", async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // ✅ Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const telegramToken = uuidv4();

        const user = await User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            telegramToken,
        });

        // ✅ Generate JWT token
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            message: "User created",
            user,
            token,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/google", async (req, res) => {
    try {
        const { email, firstName, lastName, googleId } = req.body;

        if (!email || !googleId) {
            return res.status(400).json({
                error: true,
                message: "Missing Google user data",
            });
        }

        // 🔍 Check if user exists
        let user = await User.findOne({ email });

        // 👤 If not, create user
        if (!user) {
            user = await User.create({
                email,
                firstName,
                lastName,
                googleId,
                password: null,
                telegramToken: uuidv4(),
                authProvider: "google",
            });
        }

        // 🔐 If user exists but no googleId, link account
        if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = "google";
            await user.save();
        }

        // 🔑 Generate JWT (same as your system)
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        const { password: _, ...userWithoutPassword } = user.toObject();

        return res.json({
            message: "Google auth successful",
            token,
            user: userWithoutPassword,
        });

    } catch (err) {
        return res.status(500).json({
            error: true,
            message: err.message,
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: true, message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: true, message: "Invalid credentials" });

        // ✅ Generate JWT token
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: "7d",
        });
        const { password: _, ...userWithoutPassword } = user.toObject(); // removes password

        // 🔥 KEY LOGIC - check if NFT paid
        if (!user.nft?.paid) {
            return res.json({
                message: "Login successful - payment required",
                requirePayment: true,
                userId: user._id,
                token,
                user: userWithoutPassword,
            });
        }

        return res.json({
            message: "Login successful",
            requirePayment: false,
            user: userWithoutPassword,
            token,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// wallet connect
router.post("/connect-wallet", async (req, res) => {
    try {
        const { userId, walletAddress } = req.body;

        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        user.wallet = {
            address: walletAddress,
            connected: true,
        };

        await user.save();

        res.json({
            message: "Wallet connected",
            wallet: user.wallet,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



router.post("/verify-payment", uploadCloud.single("nftFile"), async (req, res) => {
    try {
        const { userId, signature } = req.body;
        const nftFile = req.file;

        if (!userId || !signature) {
            return res.status(400).json({ error: "Missing userId or signature" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Mark NFT as paid
        user.nft = {
            paid: true,
            transactionHash: signature,
            paidAt: new Date(),
        };

        // Upload NFT image if provided
        if (nftFile) {
            const resourceType = nftFile.mimetype.startsWith("video")
                ? "video"
                : nftFile.mimetype.startsWith("image")
                    ? "image"
                    : "raw";

            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: resourceType, folder: "nft", chunk_size: 6000000 },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                streamifier.createReadStream(nftFile.buffer).pipe(stream);
            });

            user.nft.img = uploadResult.secure_url;
            user.nft.img_Id = uploadResult.public_id;
        }

        await user.save();

        res.json({
            message: "Payment verified and NFT image stored",
            nft: user.nft,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;