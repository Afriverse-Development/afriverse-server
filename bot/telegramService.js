const bot = require("./telegramBot");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");



const photoBuffer = fs.readFileSync(
  path.join(__dirname, "../assets/logo.jpg")
);

const instructions = [
  "Complete all campaign requirements",
  "Submit proof of participation",
  "Engage with content (likes, retweets, comments)",
  "Earn votes from community engagement",
  "Top participants rank on leaderboard and win rewards"
];

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

    const description =
      campaign.description?.length > 250
        ? campaign.description.slice(0, 250) + "..."
        : campaign.description;

    const requirements = (campaign.requirements || [])
      .map((r, i) => {
        const req =
          r.length > 60
            ? r.slice(0, 60) + "..."
            : r;

        return `${i + 1}. ${req}`;
      })
      .join("\n");

    const text = `
🚀 ${isLive ? "LIVE CAMPAIGN" : "NEW CAMPAIGN"}

📌 ${campaign.name}
🏗️ Project: ${campaign.projectName}

📝 DESCRIPTION:
${description}

📋 REQUIREMENTS:
${requirements}

💰 Prize Pool: $${campaign.pricePool || 0}
👥 Participants: ${campaign.participants?.length || 0}

📌 HOW IT WORKS:
• Join campaign
• Complete tasks
• Submit proof
• Earn votes
• Climb leaderboard

⏳ ${campaign.duration || 0} Days
📅 Ends: ${new Date(campaign.endDate).toDateString()}

🔥 Earn rewards on Afriverse 🌱
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