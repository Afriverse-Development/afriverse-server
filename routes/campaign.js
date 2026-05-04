const multer = require("multer");
const streamifier = require("streamifier");
const { v4: uuidv4 } = require("uuid");

const Campaign = require("../models/Campaign");
const express = require("express")
const router = express.Router()
const User = require("../models/User");
const Vote = require("../models/Votes");
const authMiddleware = require("../functions/authMiddleWave");



router.post("/create_campaign", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    const {
      type,
      description,
      requirements,
      image,
      startDate,
      endDate,
      pricePool, // ✅ ADD THIS
      name,
      projectName,
    } = req.body;

    const finalName = name || `${user.firstName} Campaign`;
    const finalProjectName =
      projectName || `${user.firstName} ${user.lastName}`;

    const finalRequirements = Array.isArray(requirements)
      ? requirements
      : requirements?.split(",") || [];

    const campaign = new Campaign({
      user: user._id,
      type,
      description,
      requirements: finalRequirements,
      image,
      startDate,
      endDate,

      name: finalName,
      projectName: finalProjectName,

      pricePool: pricePool || 0, // ✅ FIX HERE
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
});


// GET ALL CAMPAIGNS FOR LOGGED-IN USER
router.get("/campaigns", authMiddleware, async (req, res) => {
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

    // Optional safety: ensure user can access only their own campaigns
    // (remove this if campaigns are public)
    if (campaign.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this campaign",
      });
    }

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

router.post("/join_campaign", authMiddleware, async (req, res) => {
  try {
    const { campaignId, proofLink } = req.body;
    const user = req.user;

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

    // 🚫 prevent duplicate join
    const alreadyJoined = campaign.participants.find(
      (p) => p.user.toString() === user._id.toString()
    );

    if (alreadyJoined) {
      const existingUser = await User.findById(user._id).select("-password");

      // return res.status(400).json({
      //   success: false,
      //   message: "You already joined this campaign",
      //   campaign,
      //   user: existingUser, // ✅ still return user
      // });
    }

    // ✅ ADD TO CAMPAIGN
    campaign.participants.push({
      user: user._id,
      name: `${user.firstName} ${user.lastName}`,
      image: user.nft.img || "",
      votes: 0,
      proofLink
    });

    campaign.participantCount =
      (campaign.participantCount || 0) + 1;

    await campaign.save();

    // ✅ ADD TO USER
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { joinedCampaigns: campaign._id },
    });

    // 🔄 FETCH UPDATED DATA
    const updatedCampaign = await Campaign.findById(campaignId)
      .populate("participants.user");

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("joinedCampaigns");

    return res.status(200).json({
      success: true,
      message: "Joined campaign successfully",
      campaign: updatedCampaign,
      user: updatedUser, // ✅ RETURN USER
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});



router.post("/vote", authMiddleware, async (req, res) => {
  try {
    const { campaignId, targetUserId } = req.body;
    const user = req.user;

    if (!campaignId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID and target user are required",
      });
    }

    // ❌ prevent self vote
    // if (user._id.toString() === targetUserId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "You cannot vote for yourself",
    //   });
    // }

    // ❌ prevent duplicate vote
    const alreadyVoted = await Vote.findOne({
      user: user._id,
      campaign: campaignId,
    });

    if (alreadyVoted) {
      return res.status(400).json({
        success: false,
        message: "You already voted in this campaign",
      });
    }

    // ✅ create vote
    await Vote.create({
      user: user._id,
      campaign: campaignId,
      target: targetUserId,
    });

    // ✅ update campaign votes
    const campaign = await Campaign.findById(campaignId);

    const participant = campaign.participants.find(
      (p) => p.user.toString() === targetUserId
    );

    if (participant) {
      participant.votes = (participant.votes || 0) + 1;
    }

    campaign.votesCount = (campaign.votesCount || 0) + 1;

    await campaign.save();

    // 🔥 SAME PATTERN AS JOIN
    const updatedCampaign = await Campaign.findById(campaignId)
      .populate("participants.user");

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("joinedCampaigns");

    return res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
      campaign: updatedCampaign, // ✅ THIS IS KEY
      user: updatedUser,         // optional but consistent
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;