const Plan = require("../models/Plan");
const User = require("../models/User");

const checkCampaignLimit = async (userId) => {
    const user = await User.findById(userId).populate("plan");

    const limit = user.plan.features.campaignLimit;

    if (limit !== -1 && user.usage.campaignsCreatedThisMonth >= limit) {
        throw new Error("Campaign limit reached. Upgrade your plan.");
    }

    return true;
};

module.exports = checkCampaignLimit;