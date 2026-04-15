const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    email:             { type:String, required: true},
    password:          { type:String, required: false},
    firstName:         { type:String, required: true},
    lastName:          { type:String, required: true},

    googleId:          {type:String},
    auhtProvider:      {type: String, enum: ["local", "google"], default: "local"},

    //subscrition
    plan:              { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    subscriptionStatus:{ 
                          type: String, 
                          enum: ["active", "inactive","cancelled"], 
                          default: "inactive" 
                        },
    planStartDate:      { type: Date },
    planEndDate:        { type: Date },
    usage:              {
                          campaignsCreatedThisMonth: { type: Number, default: 0 },
                          participantsThisMonth: { type: Number, default: 0 },
                        },

    telegram:          { 
                            chatId: String,     
                            username: String, 
                            firstName: String, 
                            connected: { type: Boolean, default: false }
                        },
    wallet:             {
                            address: String,
                            connected: { type: Boolean, default: false }
                        },

    createdcampaign:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Campaign" }],
    joinedCampaigns:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Campaign" }],
    isEmailVerified:    { type: Boolean, default: false },
    telegramToken:      { type: String },
    walletToken:        { type: String },
    nft:                {
                            paid: { type: Boolean, default: false },
                            transactionHash: String,
                            paidAt: Date,
                            img: String,
                            img_Id: String
                         }
  },
  { timestamps: true }
);
    
module.exports = mongoose.model("User", userSchema);