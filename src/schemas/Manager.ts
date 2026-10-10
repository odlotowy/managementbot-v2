import mongoose, { Document, Schema } from "mongoose";

export interface IManager extends Document {
  discordId: string;
  discordUsername: string;

  robloxId: number | null;
  robloxUsername: string | null;
  robloxAvatar?: string | null;

  groupRankId: number | null;
  groupRankName: string | null;

  shifts: number;
  tickets: number;

  shiftLogs: string[];
  ticketLogs: string[];

  sotm: number;

  loa: number;
  ra: number;

  createdAt: Date;
}

const ManagerSchema = new Schema<IManager>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
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

    shifts: {
      type: Number,
      default: 0,
    },

    tickets: {
      type: Number,
      default: 0,
    },

    sotm: {
      type: Number,
      default: 0,
    },

    shiftLogs: {
      type: [String],
      default: [],
    },
    ticketLogs: {
      type: [String],
      default: [],
    },

    loa: {
      type: Number,
      default: 0,
    },

    ra: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IManager>("Manager", ManagerSchema);
