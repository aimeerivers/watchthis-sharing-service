import type { Document, ObjectId } from "mongoose";
import mongoose from "mongoose";

export interface IShare extends Document {
  _id: ObjectId;
  mediaId: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  message?: string;
  status: "pending" | "watched" | "archived";
  watchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema = new mongoose.Schema<IShare>(
  {
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    message: {
      type: String,
      maxLength: 500,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "watched", "archived"],
      default: "pending",
      index: true,
    },
    watchedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ShareSchema.index({ fromUserId: 1, createdAt: -1 });
ShareSchema.index({ toUserId: 1, status: 1, createdAt: -1 });
ShareSchema.index({ toUserId: 1, status: 1 });
ShareSchema.index({ fromUserId: 1, status: 1 });

// Virtual for id field
ShareSchema.virtual("id").get(function () {
  return this._id as ObjectId;
});

ShareSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

// Middleware to set watchedAt when status changes to watched
ShareSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "watched" && !this.watchedAt) {
    this.watchedAt = new Date();
  }
  next();
});

const Share = mongoose.model("Share", ShareSchema);

export { Share };
