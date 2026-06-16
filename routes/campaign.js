const multer = require("multer");
const streamifier = require("streamifier");
const { v4: uuidv4 } = require("uuid");

const Campaign = require("../models/Campaign");
const express = require("express")
const router = express.Router()
const User = require("../models/User");
const Vote = require("../models/Votes");
const authMiddleware = require("../functions/authMiddleWave");
const auth = require("../middlewave/auth");
const { sendCampaignNotification } = require("../bot/telegramService");



router.post("/create_campaign", auth, async (req, res) => {
  try {
    const userId = req.user.id; // 🔥 IMPORTANT FIX

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      type,
      description,
      requirements,
      image,
      startDate,
      endDate,
      pricePool,
      name,
      projectName,
    } = req.body;

    const finalRequirements = Array.isArray(requirements)
      ? requirements
      : requirements?.split(",") || [];

    const campaign = new Campaign({
      user: user._id, // ✅ now always valid
      type,
      description,
      requirements: finalRequirements,
      image,
      startDate,
      endDate,
      name: name || `${user.firstName} Campaign`,
      projectName: projectName || `${user.firstName} ${user.lastName}`,
      pricePool: pricePool || 0,
    });

    await campaign.save();

    await User.findByIdAndUpdate(user._id, {
      $push: { campaigns: campaign._id },
    });

    const updatedUser = await User.findById(user._id).select("-password");

    await sendCampaignNotification(campaign, user);

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
      user: updatedUser,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}); s


// GET ALL CAMPAIGNS FOR LOGGED-IN USER
router.get("/campaigns", auth, async (req, res) => {
  try {
    const now = new Date();

    const campaigns = await Campaign.find().sort({ createdAt: -1 });

    const updates = [];

    for (let campaign of campaigns) {
      let newStatus = campaign.status;

      if (now < campaign.startDate) {
        newStatus = "upcoming";
      }
      else if (now >= campaign.startDate && now <= campaign.endDate) {
        newStatus = "live";
      }
      else if (now > campaign.endDate) {
        newStatus = "completed";
      }

      if (campaign.status !== newStatus) {
        await Campaign.updateOne(
          { _id: campaign._id },
          { $set: { status: newStatus } }
        );
      }
    }

    // wait for all DB updates
    await Promise.all(updates);

    const refreshedCampaigns = await Campaign.find().sort({ createdAt: -1 });

    res.json({
      count: refreshedCampaigns.length,
      campaigns: refreshedCampaigns,
    });

  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message,
    });
  }
});


// GET SINGLE CAMPAIGN (BY ID)

router.get("/campaign/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findById(id).populate("user");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // 🔥 FIXED AUTH USAGE (your system)
    const userId = req.user.id;

    // Optional safety: only allow owner to view
    // if (campaign.user._id.toString() !== userId.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You are not allowed to view this campaign",
    //   });
    // }

    return res.status(200).json({
      success: true,
      campaign,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/join_campaign", auth, async (req, res) => {
  try {
    const { campaignId, proofLink } = req.body;

    const userId = req.user.id; // 🔥 IMPORTANT (your auth style)

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // 🚫 prevent joining after campaign ends
    if (new Date() > new Date(campaign.endDate)) {
      return res.status(400).json({
        success: false,
        message: "Campaign has already ended",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🚫 prevent duplicate join
    const alreadyJoined = campaign.participants.find(
      (p) => p.user.toString() === userId.toString()
    );

    if (alreadyJoined) {
      const existingUser = await User.findById(userId);

      return res.status(200).json({
        success: true,
        message: "Already joined this campaign",
        campaign,
        user: sanitizeUser(existingUser), // 🔥 SAFE RESPONSE
      });
    }

    // ✅ ADD TO CAMPAIGN
    campaign.participants.push({
      user: user._id,
      name: `${user.firstName} ${user.lastName}`,
      image: user.nft?.img || "",
      votes: 0,
      proofLink,
    });

    campaign.participantCount = (campaign.participantCount || 0) + 1;

    await campaign.save();

    // ✅ ADD TO USER
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { joinedCampaigns: campaign._id },
    });

    // 🔄 FETCH UPDATED DATA
    const updatedCampaign = await Campaign.findById(campaignId)
      .populate("participants.user");

    const updatedUser = await User.findById(userId);

    return res.status(200).json({
      success: true,
      message: "Joined campaign successfully",
      campaign: updatedCampaign,
      user: sanitizeUser(updatedUser), // 🔥 CLEAN OUTPUT
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


router.post("/vote", auth, async (req, res) => {
  try {
    const { campaignId, targetUserId } = req.body;

    const userId = req.user.id; // 🔥 IMPORTANT FIX (your auth style)

    if (!campaignId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and target user are required",
      });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ❌ prevent duplicate vote
    const alreadyVoted = await Vote.findOne({
      user: userId,
      campaign: campaignId,
    });

    if (alreadyVoted) {
      return res.status(400).json({
        success: false,
        message: "You already voted in this campaign",
      });
    }

    // ❌ prevent self vote (optional but recommended)
    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot vote for yourself",
      });
    }

    // ✅ create vote
    await Vote.create({
      user: userId,
      campaign: campaignId,
      target: targetUserId,
    });

    // ✅ update campaign votes
    const participant = campaign.participants.find(
      (p) => p.user.toString() === targetUserId.toString()
    );

    if (participant) {
      participant.votes = (participant.votes || 0) + 1;
    }

    campaign.votesCount = (campaign.votesCount || 0) + 1;

    await campaign.save();

    // 🔄 fetch updated data
    const updatedCampaign = await Campaign.findById(campaignId)
      .populate("participants.user");

    const updatedUser = await User.findById(userId);

    return res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
      campaign: updatedCampaign,
      user: sanitizeUser(updatedUser), // 🔥 SAFE OUTPUT
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;