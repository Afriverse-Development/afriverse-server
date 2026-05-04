const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },

        target: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // 👈 who they are voting for
            required: true,
        },

        vote: {
            type: Number,
            default: 1,
        },
    },
    { timestamps: true }
);

// prevent duplicate vote per user per campaign
voteSchema.index({ user: 1, campaign: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);

module.exports = Vote;