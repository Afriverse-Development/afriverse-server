// bot/telegramBot.js

const TelegramBot = require("node-telegram-bot-api");
const User = require("../models/User.js")

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text.startsWith("/start")) return;

    const parts = text.split(" ");
    const token = parts[1];

    if (!token) {
        return bot.sendMessage(chatId, "❌ No token provided. Use the link from the app.");
    }
    const user = await User.findOne({ telegramToken: token });

    if (!user) {
        return bot.sendMessage(chatId, "❌ Invalid or expired link.");
    }

    user.telegram = {
        chatId,
        username: msg.from.username,
        firstName: msg.from.first_name,
        connected: true,
    };

    user.telegramToken = null;
    console.log("Saving user with Telegram info:", user);
    await user.save();


    // after saving the user
    await user.save();

    // ✅ Send a rich welcome message
    const welcomeText = `
🌍 Welcome to Afriverse, ${user.firstName}!

Afriverse empowers African builders and communities in the Web3 era. Learn, build, and earn with decentralized tools, NFTs, AI-powered support, and our vibrant community. Explore, showcase your projects, and be part of Africa’s leading innovation platform.

Click below to continue to Afriverse and connect your wallet.
`;

    const path = require("path");
    const fs = require("fs");
    const photoBuffer = fs.readFileSync(path.join(__dirname, "../assets/logo.jpg"));

    bot.sendPhoto(chatId, photoBuffer, {
        caption: welcomeText,
        reply_markup: {
            inline_keyboard: [
                [{ text: "Continue to Afriverse 🌱",url: `${process.env.HOSTNAME}/login?connectWallet=true&userId=${user._id}` }]
            ]
        }
    });
}
);

module.exports = bot;