import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  remarks: {
    type: String,
    default: "",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
});

// Define the leave schema with a GeoJSON location
const leaveSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    leaveType: {
      type: String,
      default: "regular",
    },
    contactNumber: {
      type: String,
      default: "",
    },
    parentContact: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    parentReview: reviewSchema,
    staffReview: reviewSchema,

    leaveLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: function (this: { status: string }) {
          return this.status === "pending";
        }
      },
    },
  },
  { timestamps: true }
);

leaveSchema.index({ leaveLocation: "2dsphere" });

const Leave = mongoose.model("Leave", leaveSchema);

export default Leave;
