import { model, Schema, type InferSchemaType } from "mongoose";

const suspensionSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    moderatorId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: "No reason provided.",
    },
    roleIds: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

suspensionSchema.index({ guildId: 1, userId: 1, active: 1 });

export type SuspensionDocument = InferSchemaType<typeof suspensionSchema>;

export const SuspensionModel = model("Suspension", suspensionSchema);
