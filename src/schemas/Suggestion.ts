import mongoose, { Document, Schema } from "mongoose";

export interface ISuggestionVote {
  userId: string;
  vote: "up" | "down";
}

export interface ISuggestion extends Document {
  messageId: string;
  channelId: string;
  threadId: string;

  authorId: string;
  authorName: string;
  authorAvatar: string | null;

  title: string;
  description: string;
  type: string;

  upvotes: number;
  downvotes: number;

  votes: ISuggestionVote[];

  createdAt: Date;
}

const SuggestionVoteSchema = new Schema<ISuggestionVote>(
  {
    userId: {
      type: String,
      required: true,
    },

    vote: {
      type: String,
      enum: ["up", "down"],
      required: true,
    },
  },
  {
    _id: false,
  },
);

const SuggestionSchema = new Schema<ISuggestion>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
    },

    channelId: {
      type: String,
      required: true,
    },

    threadId: {
      type: String,
      required: true,
    },

    authorId: {
      type: String,
      required: true,
    },

    authorName: {
      type: String,
      required: true,
    },

    authorAvatar: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    upvotes: {
      type: Number,
      default: 0,
    },

    downvotes: {
      type: Number,
      default: 0,
    },

    votes: {
      type: [SuggestionVoteSchema],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

export default mongoose.model<ISuggestion>("Suggestion", SuggestionSchema);
