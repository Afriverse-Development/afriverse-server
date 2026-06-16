const bot = require("./telegramBot");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");



const photoBuffer = fs.readFileSync(
  path.join(__dirname, "../assets/logo.jpg")
);

// make sure bot is exported from your telegram bot file

const sendCampaignNotification = async (campaign, creator) => {
  try {
    // only users with telegram connected
    const users = await User.find({
      "telegram.connected": true,
      "telegram.chatId": { $exists: true },
    });

    const isLive =
      new Date() >= new Date(campaign.startDate) &&
      new Date() <= new Date(campaign.endDate);

    const text = `
🚀 ${isLive ? "LIVE CAMPAIGN" : "NEW CAMPAIGN"}

📌 ${campaign.name}
🏗️ Project: ${campaign.projectName}
🧠 Type: ${campaign.type}

📝 ${campaign.description}

💰 Prize Pool: $${campaign.pricePool || 0}
👥 Participants: ${campaign.participantCount || 0}
📊 Votes: ${campaign.votesCount || 0}

⏳ Duration: ${campaign.duration || 0} days
📅 Starts: ${new Date(campaign.startDate).toDateString()}
📅 Ends: ${new Date(campaign.endDate).toDateString()}

🔥 Compete, vote, and climb the leaderboard to earn rewards in Afriverse 🌱
`;

    const sendPromises = users.map(async (user) => {
      try {
        return await bot.sendPhoto(
          user.telegram.chatId,
          photoBuffer,
          {
            caption: text,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚀 View Campaign",
                    url: `${process.env.HOSTNAME}/campaign/details?id=${campaign._id}`
                  },
                ],
                [
                  {
                    text: "👥 Join Campaign",
                    url: `${process.env.HOSTNAME}/campaign/details?id=${campaign._id}`
                  },
                  {
                    text: "🗳 Leaderboard",
                    url: `${process.env.HOSTNAME}/campaign/details?id=${campaign._id}`
                  },
                ],
                [
                  {
                    text: "📊 About Project",
                    url: `${process.env.HOSTNAME}/project/${campaign.projectName}`,
                  },
                ],
                [
                  {
                    text: "🌍 Open Afriverse",
                    url: `${process.env.HOSTNAME}`,
                  },
                ],
              ],
            },
          }
        );
      } catch (err) {
        console.log(`❌ Failed for user ${user._id}:`, err.message);
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error("❌ Campaign notification error:", err.message);
  }
};


module.exports = {
  sendCampaignNotification
};