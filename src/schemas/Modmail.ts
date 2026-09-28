import { Schema, model, models, HydratedDocument } from "mongoose";

export interface IModMail {
  userId: string;
  guildId: string;
  category: string;
  status: "collecting" | "open" | "closed";
  questionIndex: number;
  answers: string[];
  channelId?: string;
  claimedBy?: string;
  createdAt: Date;
  closedAt?: Date;
}

const ModMailSchema = new Schema<IModMail>({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ["collecting", "open", "closed"],
    default: "collecting",
  },
  questionIndex: { type: Number, default: 0 },
  answers: { type: [String], default: [] },
  channelId: { type: String },
  claimedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

ModMailSchema.index({ userId: 1, status: 1 });

export default models.ModMail || model<IModMail>("ModMail", ModMailSchema);
export type ModMailDocument = HydratedDocument<IModMail>;
