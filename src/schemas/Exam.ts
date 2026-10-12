import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface IExam {
  discordUserId: string;
  discordUsername: string;
  email: string;
  guildId: string;
  startChannelId: string;
  logChannelId: string;
  startedAt: Date;
  status: "pending" | "submitted";
  submittedAt?: Date;
  submissionId?: string;
}

const examSchema = new Schema<IExam>(
  {
    discordUserId: { type: String, required: true, index: true },
    discordUsername: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    guildId: { type: String, required: true },
    startChannelId: { type: String, required: true },
    logChannelId: { type: String, required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "submitted"],
      default: "pending",
      required: true,
    },
    submittedAt: { type: Date },
    submissionId: { type: String },
  },
  { timestamps: true },
);

examSchema.index({ email: 1, status: 1 });
examSchema.index({ submissionId: 1 }, { unique: true, sparse: true });

export default models.Exam || model<IExam>("Exam", examSchema);
