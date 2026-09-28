import mongoose, { Document, Schema } from "mongoose";

export interface IVerificationRequest extends Document {
  discordId: string;
  discordUsername: string;

  robloxId: number | null;
  robloxUsername: string | null;
  robloxAvatar?: string | null;

  groupRankId: number | null;
  groupRankName: string | null;

  invitedBy: string;

  status: "pending" | "processing" | "approved" | "denied";

  messageId?: string;
  channelId?: string;

  approvedBy?: string;
  approvedAt?: Date;

  deniedBy?: string;
  deniedAt?: Date;

  createdAt: Date;
}

const VerificationRequestSchema = new Schema<IVerificationRequest>(
  {
    discordId: {
      type: String,
      required: true,
    },

    discordUsername: {
      type: String,
      required: true,
    },

    robloxId: {
      type: Number,
      required: true,
    },

    robloxUsername: {
      type: String,
      required: true,
    },

    robloxAvatar: {
      type: String,
    },

    groupRankId: {
      type: Number,
      required: true,
    },

    groupRankName: {
      type: String,
      required: true,
    },

    invitedBy: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "approved", "denied"],
      default: "pending",
    },

    messageId: String,
    channelId: String,

    approvedBy: String,
    approvedAt: Date,

    deniedBy: String,
    deniedAt: Date,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IVerificationRequest>(
  "VerificationRequest",
  VerificationRequestSchema,
);
