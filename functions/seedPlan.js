require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Plan = require("../models/Plan");

const dns = require("dns");
const dnsPromises = require("node:dns/promises");

dnsPromises.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");


const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Optional: clear existing plans (prevents duplicates)
        await Plan.deleteMany();

        const plans = [
            {
                name: "Starter",
                price: 49,
                billingCycle: "monthly",
                features: {
                    campaignsLimit: 1,
                    participantsLimit: 500,
                    campaignDurationDays: 7,
                    analytics: false,
                    prioritySupport: false,
                    featuredCampaign: false,
                },
            },
            {
                name: "Professional",
                price: 149,
                billingCycle: "monthly",
                features: {
                    campaignsLimit: 5,
                    participantsLimit: 5000,
                    campaignDurationDays: 30,
                    analytics: false,
                    prioritySupport: true,
                    featuredCampaign: false,
                },
            },
            {
                name: "Enterprise",
                price: 499,
                billingCycle: "monthly",
                features: {
                    campaignsLimit: -1, // unlimited
                    participantsLimit: -1,
                    campaignDurationDays: -1,
                    analytics: true,
                    prioritySupport: true,
                    featuredCampaign: true,
                },
            },
        ];

        await Plan.insertMany(plans);

        console.log("✅ Plans seeded successfully");
        process.exit();
    } catch (error) {
        console.error("❌ Error seeding plans:", error);
        process.exit(1);
    }
};

seedPlans();