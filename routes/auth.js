// routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User.js");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const streamifier = require('streamifier');
const setAuthCookie = require("../utils/setAuthCookie.js");
const cloudinary = require('cloudinary').v2;
const axios = require("axios");
const sanitizeUser = require("../utils/sanitizeUser.js");
const { TwitterApi } = require("twitter-api-v2");
const passport = require("passport");
const auth = require("../middlewave/auth.js");

const uploadCloud = multer(); // for memory storage (buffer)

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET

const redirectUri = process.env.TWITTER_REDIRECT_URI;



// ========================================
// Twitter Login
// ========================================
router.get(
    "/twitter",
    passport.authenticate("twitter")
);

// ========================================
// Twitter Callback
// ========================================
router.get(
    "/twitter/callback",
    passport.authenticate("twitter", {
        failureRedirect: process.env.FRONTEND_URL,
        session: false,
    }),
    async (req, res) => {
        try {
            console.log("TWITTER CALLBACK HIT");
            console.log("USER:", req.user);

            const user = req.user;

            if (!user) {
                console.log("NO USER RETURNED");
                return res.status(500).json({
                    error: "No user returned from passport"
                });
            }

            const token = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "30d",
                }
            );

            setAuthCookie(res, token);

            return res.redirect(process.env.FRONTEND_URL);

        } catch (error) {
            console.error("TWITTER CALLBACK ERROR:");
            console.error(error);

            return res.status(500).json({
                error: error.message,
                stack: error.stack
            });
        }
    }
);

router.post("/register", async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // ✅ Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long"
            });
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

        setAuthCookie(res, token);

        return res.json({
            success: true,
            user: sanitizeUser(user , true),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/google", async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Google token required",
            });
        }

        // Verify token with Google
        const googleResponse = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const profile = googleResponse.data;

        const email = profile.email;
        const googleId = profile.sub;
        const firstName = profile.given_name || "";
        const lastName = profile.family_name || "";

        if (!email || !googleId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Google account",
            });
        }

        // ==================================
        // Find Existing User
        // ==================================

        let user = await User.findOne({ email });

        // ==================================
        // Create New User
        // ==================================

        if (!user) {
            user = await User.create({
                email,
                firstName,
                lastName,
                googleId,
                authProvider: "google",
                telegramToken: uuidv4(),
                isEmailVerified: true,
            });
        }

        // ==================================
        // Link Google To Existing Account
        // ==================================

        if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        // ==================================
        // Create Session
        // ==================================

        const jwtToken = jwt.sign(
            {
                id: user._id,
                email: user.email,
            },
            JWT_SECRET,
            {
                expiresIn: "30d",
            }
        );

        setAuthCookie(res, jwtToken);

        return res.json({
            success: true,
            user: sanitizeUser(user, true),
        });

    } catch (err) {
        console.error("GOOGLE AUTH ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Google authentication failed",
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                error: true,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                error: true,
                message: "Invalid credentials"
            });
        }

        // ✅ Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        const { password: _, ...userWithoutPassword } = user.toObject();

        // // ==========================
        // // 🔥 STEP 1: TELEGRAM CHECK
        // // ==========================
        // if (!user.telegram?.connected) {
        //     return res.json({
        //         message: "Login successful - Telegram required",
        //         requireTelegram: true,
        //         telegramToken: user.telegramToken,
        //         userId: user._id,
        //         token,
        //         user: userWithoutPassword,
        //     });
        // }

        // // ==========================
        // // 🔥 STEP 2: WALLET CHECK
        // // ==========================
        // if (!user.wallet?.connected) {
        //     return res.json({
        //         message: "Login successful - wallet required",
        //         requireWallet: true,
        //         userId: user._id,
        //         token,
        //         user: userWithoutPassword,
        //     });
        // }

        // // ==========================
        // // 🔥 STEP 3: NFT CHECK
        // // ==========================
        // if (!user.nft?.paid) {
        //     return res.json({
        //         message: "Login successful - payment required",
        //         requirePayment: true,
        //         userId: user._id,
        //         token,
        //         user: userWithoutPassword,
        //     });
        // }

        // ==========================
        // ✅ FULL ACCESS
        // ==========================
        setAuthCookie(res, token);

        return res.json({
            success: true,
            user: sanitizeUser(user, true),
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// router.post("/login", async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(400).json({
//                 error: true,
//                 message: "User not found"
//             });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({
//                 error: true,
//                 message: "Invalid credentials"
//             });
//         }

//         // ✅ Generate JWT
//         const token = jwt.sign(
//             { id: user._id, email: user.email },
//             JWT_SECRET,
//             { expiresIn: "7d" }
//         );

//         const { password: _, ...userWithoutPassword } = user.toObject();

//         // ==========================
//         // 🔥 STEP 1: TELEGRAM CHECK
//         // ==========================
//         if (!user.telegram?.connected) {
//             return res.json({
//                 message: "Login successful - Telegram required",
//                 requireTelegram: true,
//                 telegramToken: user.telegramToken,
//                 userId: user._id,
//                 token,
//                 user: userWithoutPassword,
//             });
//         }

//         // ==========================
//         // 🔥 STEP 2: WALLET CHECK
//         // ==========================
//         if (!user.wallet?.connected) {
//             return res.json({
//                 message: "Login successful - wallet required",
//                 requireWallet: true,
//                 userId: user._id,
//                 token,
//                 user: userWithoutPassword,
//             });
//         }

//         // ==========================
//         // 🔥 STEP 3: NFT CHECK
//         // ==========================
//         if (!user.nft?.paid) {
//             return res.json({
//                 message: "Login successful - payment required",
//                 requirePayment: true,
//                 userId: user._id,
//                 token,
//                 user: userWithoutPassword,
//             });
//         }

//         // ==========================
//         // ✅ FULL ACCESS
//         // ==========================
//         return res.json({
//             message: "Login successful",
//             requireTelegram: false,
//             requireWallet: false,
//             requirePayment: false,
//             user: userWithoutPassword,
//             token,
//         });

//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

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

router.get("/get_me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }

        const { password, __v, ...sanitizedUser } = user.toObject();

        return res.status(200).json({
            user: sanitizedUser,
        });
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});


router.post("/telegram-login", async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Missing token",
            });
        }

        // 1. Verify JWT from bot
        const decoded = jwt.verify(token, JWT_SECRET);

        // 2. Find user
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const { password, ...userWithoutPassword } = user.toObject();

        // 3. Create NEW session token for app login
        const appToken = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            success: true,
            token: appToken,
            user: userWithoutPassword,
        });

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
});


router.post("/logout", (req, res) => {
    res.clearCookie("token");

    res.json({
        success: true,
        message: "Logged out successfully"
    });
});




module.exports = router;