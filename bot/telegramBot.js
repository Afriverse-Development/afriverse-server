const TelegramBot = require("node-telegram-bot-api");
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const botToken = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(botToken, { polling: true });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text.startsWith("/start")) return;

    const parts = text.split(" ");
    const telegramToken = parts[1];

    if (!telegramToken) {
        return bot.sendMessage(chatId, "❌ No token provided. Use the link from the app.");
    }

    let user = await User.findOne({ telegramToken });

    if (!user) {
        return bot.sendMessage(chatId, "❌ Invalid or expired link.");
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

Click below to continue to Afriverse and connect your wallet.
`;

    const photoBuffer = fs.readFileSync(
        path.join(__dirname, "../assets/logo.jpg")
    );

    bot.sendPhoto(chatId, photoBuffer, {
        caption: welcomeText,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Continue to Afriverse 🌱",
                        url: `${process.env.HOSTNAME}/telegram-success?token=${jwtToken}`,
                    },
                ],
            ],
        },
    });
});

module.exports = bot;