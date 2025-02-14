import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Leave from "./leave.model.js";
import Complaint from "./complaints.model.js";

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "student" | "staff" | "parent";
  roomNumber?: string;
  parentId?: mongoose.Types.ObjectId;
  children?: mongoose.Types.ObjectId[];
  profilePicUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  location?: IGeoLocation;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
interface IGeoLocation {
  type: "Point";
  coordinates: number[];
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "student", "staff", "parent"],
      default: "student",
    },
    roomNumber: {
      type: String,
      required: function (): boolean {
        return (this as IUser).role === "student";
      },
      sparse: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      validate: {
        validator: function (value: mongoose.Types.ObjectId | undefined) {
          const user = this as IUser;
          if (value && user.role !== "student") {
            return false;
          }
          return true;
        },
        message: "Only students can have a parent assigned",
      },
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        validate: {
          validator: function (this: IUser) {
            return this.role === "parent";
          },
          message: "Only parents can have children assigned",
        },
      },
    ],
    profilePicUrl: {
      type: String,
      default: null,
      trim: true,
    },
    resetPasswordToken: {
      type: String,
      default: null, // Default to null if no token is generated
    },
    resetPasswordExpires: {
      type: Date,
      default: null, // Default to null if no expiration is set
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        // Require location only if the role is "student" or "parent"
        required: function (this: IUser) {
          return this.role === "student" || this.role === "parent";
        },
        // Validate that coordinates is an array of two numbers: [longitude, latitude]
        validate: {
          validator: function (val: number[]) {
            return Array.isArray(val) && val.length === 2;
          },
          message:
            "Coordinates must be an array of two numbers [longitude, latitude]",
        },
      },
    },
  },

  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();  // Only hash if password is modified

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});
userSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    // 'this' refers to the document (the student) being deleted
    await Leave.deleteMany({ studentId: this._id });
    await Complaint.deleteMany({ studentId: this._id });
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
