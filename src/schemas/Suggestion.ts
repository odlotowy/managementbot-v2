import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISuggestion extends Document {
  suggestId: string;
  authorId: string;
  messageId: string;
  channelId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const SuggestionSchema = new Schema<ISuggestion>(
  {
    suggestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    authorId: {
      type: String,
      required: true,
    },

    messageId: {
      type: String,
      required: true,
    },

    channelId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

export const SuggestionModel: Model<ISuggestion> = mongoose.model<ISuggestion>(
  "Suggestion",
  SuggestionSchema,
);
