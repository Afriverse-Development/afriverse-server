const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
    {
        user:                   { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },

        name:                   { type: String, required: true },
        projectName:            { type: String, required: true },

        type:                   { type: String, required: true },
        description:            { type: String, required: true },
        contentDetail:          { type: String  },

        image:                  { type: String },

        requirements:           {type: [String], default: []},
        startDate:              { type: Date, required: true },
        endDate:                {
                                     type: Date,
                                     required: true,
                                     validate: {
                                                    validator: function (value) {
                                                    return value > this.startDate;
                                                    },
                                     message: "End date must be after start date",
                                                },
                                 }, 
        // duration:               { type: Number }, // in days

        participants:           [ 
                                 {
                                    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                                    name: String,
                                    image: String,
                                    votes: { type: Number, default: 0 },
                                    },                       
                                ],
        participantCount:        {type: Number, default: 0},
        pricePool:              { type: Number, default: 0 },
        votesCount:             { type: Number, default: 0 },
        status:                 { type: String, enum: ["active", "completed", "live", "upcoming"], default: "upcoming" },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// Virtual for duration
campaignSchema.virtual("duration").get(function () {
    if (this.startDate && this.endDate) {
        const diff = this.endDate - this.startDate;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
});





// Indexes
campaignSchema.index({ user: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);