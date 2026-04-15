const express = require("express");
const Router = express.Router();
const Plan = require("../models/Plan"); // ✅ import Plan model
const authMiddleware = require("../functions/authMiddleWave");

// ✅ GET all plans
Router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 }); // optional: sort by price

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
});


Router.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const user = req.user; // 🔥 from middleware
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // 🔥 subscription dates
    const startDate = new Date();
    const endDate = new Date();

    if (plan.billingCycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // 🔥 update user
    user.plan = plan._id;
    user.subscriptionStatus = "active";
    user.planStartDate = startDate;
    user.planEndDate = endDate;

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Subscribed to ${plan.name}`,
      user: user,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Subscription failed",
    });
  }
});



module.exports = Router;