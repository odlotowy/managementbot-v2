import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStaffNote extends Document {
  noteId: number;
  userId: string;
  authorId: string;
  content: string;
  category: "General" | "Performance" | "Behaviour" | "Concern";
  createdAt: Date;
  updatedAt: Date;
}

const StaffNoteSchema = new Schema<IStaffNote>(
  {
    noteId: {
      type: Number,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["General", "Performance", "Behaviour", "Concern"],
      default: "General",
    },
  },
  {
    timestamps: true,
  },
);

const StaffNote: Model<IStaffNote> =
  mongoose.models.StaffNote ||
  mongoose.model<IStaffNote>("StaffNote", StaffNoteSchema);

export default StaffNote;
