import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  student: mongoose.Types.ObjectId; // Reference to User
  description: string;
  status: string;
  type: string; // New field for complaint type
  studentDetails: {
    firstName: string;
    roomNumber: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const complaintSchema = new Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Resolved"], default: "Pending" },
    type: {
      type: String,
      enum: ["Maintenance", "Disciplinary", "Other"], // Add complaint categories
      required: true
    },
    studentDetails: {
      firstName: { type: String, required: true },
      roomNumber: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
