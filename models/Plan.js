const mongoose = require("mongoose")

const planSchema = new mongoose.Schema(
    {
        name:            { 
                            type:  String, 
                            required: true , 
                            enum: ["Starter", "Professional", "Enterprise"]
                          },
        price:           { type: Number, required: true },
        billingCycle:   { 
                            type: String, 
                            default: "monthly",
                            enum: ["monthly", "yearly"]
                         },
        features:        {
                            campaignsLimit:       { type: Number, default: -1 }, // e.g 1 , 2, 5 , unlimited
                            participantsLimit:    { type: Number, default: -1 }, // e.g 100, 500, 1000, unlimited
                            campaignDurationDays: { type: Number, default: -1 }, // e.g 30, 90, 365
                            analytics:            { type: Boolean, default: false },
                            prioritySupport:      { type: Boolean, default: false },
                            featuredCampaign:     { type: Boolean, default: false },
                         } ,
    }, { timestamps: true }                     
);

module.exports = mongoose.model("Plan", planSchema)