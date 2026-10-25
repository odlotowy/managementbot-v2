import mongoose, { Schema } from "mongoose";

const WarningSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    moderatorId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      default: "No reason provided.",
      maxlength: 500,
    },
    duration: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    dmSent: {
      type: Boolean,
      default: null,
    },
    revokedBy: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

export const WarningModel =
  mongoose.models.Warning ?? mongoose.model("Warning", WarningSchema);
