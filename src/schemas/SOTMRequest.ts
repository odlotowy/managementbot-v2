import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

const SOTMRequestSchema = new Schema(
  {
    robloxUsername: {
      type: String,
      required: true,
      trim: true,
    },
    discordUsername: {
      type: String,
      required: true,
      trim: true,
    },
    candidateDiscordId: {
      type: String,
      required: true,
    },
    justification: {
      type: String,
      required: true,
      trim: true,
    },
    proof: {
      type: String,
      default: "",
    },
    submittedBy: {
      type: String,
      required: true,
    },
    submittedByTag: {
      type: String,
      required: true,
    },
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
      required: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type ISOTMRequest = InferSchemaType<typeof SOTMRequestSchema>;

const SOTMRequest =
  (models.SOTMRequest as Model<ISOTMRequest> | undefined) ??
  model<ISOTMRequest>("SOTMRequest", SOTMRequestSchema);

export default SOTMRequest;
