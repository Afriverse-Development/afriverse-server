const TelegramBot = require("node-telegram-bot-api");
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const HOST = process.env.HOSTNAME;

const bot = new TelegramBot(botToken, { polling: true });

// reusable fallback message
const sendWelcomeFallback = (chatId) => {
    const text = `
🌍 Welcome to Afriverse

A decentralized ecosystem built for creators, traders, and builders 🚀

Even if something went wrong with your login link, you can still explore Afriverse:

• Join the community
• Follow updates & drops
• Learn Web3 with Afriverse Academy
• Connect your wallet anytime

Let’s build the future of Web3 together 🌱
`;

    const photoBuffer = fs.readFileSync(
        path.join(__dirname, "../assets/logo.jpg")
    );

    return bot.sendPhoto(chatId, photoBuffer, {
        caption: text,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🌐 Open Afriverse",
                        url: `${HOST}`,
                    },
                ],
                [
                    {
                        text: "𝕏 Follow us on X",
                        url: "https://x.com/afriverse", // change to yours
                    },
                    {
                        text: "💬 Join Community",
                        url: "https://t.me/afriverse", // change to yours
                    },
                ],
            ],
        },
    });
};

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || "";

    if (!text.startsWith("/start")) {
        // optional: still respond nicely to random messages
        return sendWelcomeFallback(chatId);
    }

    const parts = text.split(" ");
    const telegramToken = parts[1];

    // ❌ NO TOKEN PROVIDED → still show good UX
    if (!telegramToken) {
        return sendWelcomeFallback(chatId);
    }

    try {
        let user = await User.findOne({ telegramToken });

        // ❌ INVALID TOKEN → still show good UX
        if (!user) {
            return sendWelcomeFallback(chatId);
        }

        // ✅ CONNECT TELEGRAM
        user.telegram = {
            chatId,
            username: msg.from.username,
            firstName: msg.from.first_name,
            connected: true,
        };

        user.telegramToken = null;
        await user.save();

        const jwtToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const welcomeText = `
🌍 Welcome to Afriverse, ${user.firstName}!

You’ve just taken your first step into the Afriverse ecosystem 🚀

Here’s what you can do next:
• Connect your wallet
• Explore rewards & referrals
• Join our community channels
• Stay updated on drops & announcements

Let’s build the future of Web3 together 🌱
`;

        const photoBuffer = fs.readFileSync(
            path.join(__dirname, "../assets/logo.jpg")
        );

        return bot.sendPhoto(chatId, photoBuffer, {
            caption: welcomeText,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝕏 Follow Afriverse",
                            url: "https://x.com/afriverse",
                        },
                        {
                            text: "💬 Telegram Community",
                            url: "https://t.me/afriverse",
                        },
                    ],
                    [
                        {
                            text: "🌐 Visit Website",
                            url: `${HOST}`,
                        },
                    ],
                    [
                        {
                            text: "🚀 Continue to Afriverse",
                            url: `${HOST}/telegram-success?token=${jwtToken}`,
                        },
                    ],
                ],
            },
        });
    } catch (err) {
        console.error(err);
        return sendWelcomeFallback(chatId);
    }
});

module.exports = bot;