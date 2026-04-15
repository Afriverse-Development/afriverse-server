const bot = require("./telegramBot");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

const sendCampaignNotification = async (campaign) => {
  try {
    const users = await User.find({
      "telegram.connected": true,
      "telegram.chatId": { $exists: true }
    });

    const message = `
🚀 New Campaign Launched!

📌 ${campaign.name}
🧠 Type: ${campaign.type}

📝 ${campaign.description}

━━━━━━━━━━━━━━
🔥 Join the campaign and earn rewards on Afriverse
━━━━━━━━━━━━━━
`;

    // ✅ LOCAL IMAGE (SAFE)
    const photoBuffer = fs.readFileSync(
      path.join(__dirname, "../assets/logo.jpg")
    );

    for (const user of users) {
      try {
        await bot.sendPhoto(user.telegram.chatId, photoBuffer, {
          caption: message,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🚀 View Campaign",
                  url: `${process.env.HOSTNAME}/campaign/details?id=${campaign._id}`
                }
              ],
              [
                {
                  text: "🐦 Check X Profile",
                  url: "https://x.com/afriverse"
                }
              ]
            ]
          }
        });
      } catch (err) {
        console.log("Telegram send error:", err.message);
      }
    }

  } catch (err) {
    console.log("Notification error:", err.message);
  }
};

module.exports = {
  sendCampaignNotification
};