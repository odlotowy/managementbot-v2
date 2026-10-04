import { HydratedDocument, model, models, Schema } from "mongoose";

export interface ITraining {
  guildId: string;
  channelId: string;
  traineeId: string;
  trainerId: string;
  currentPart: number;
  status: "active" | "completed";
  startedAt: Date;
  completedAt?: Date;
}

export type TrainingDocument = HydratedDocument<ITraining>;

const trainingSchema = new Schema<ITraining>(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    traineeId: {
      type: String,
      required: true,
      index: true,
    },
    trainerId: {
      type: String,
      required: true,
    },
    currentPart: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

trainingSchema.index({
  guildId: 1,
  traineeId: 1,
  status: 1,
});

export default models.Training || model<ITraining>("Training", trainingSchema);
