import { Request, Response } from "express";
import User, { IUser } from "../models/user.model.js";
import Leave from "../models/leave.model.js";
import mongoose from "mongoose";

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    location?: IGeoLocation;
  };
}
interface IGeoLocation {
  type: "Point";
  coordinates: number[];
}
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(coords1: number[], coords2: number[]): number {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


export const getChildStats = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;

    // Find parent and their children
    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Find all children using parent's children array
    const children = await User.find({
      _id: { $in: parent.children },
      role: "student",
    });

    if (!children.length) {
      return res.status(404).json({ message: "No children found" });
    }

    // Get leave statistics for all children
    const childrenStats = await Promise.all(
      children.map(async (child) => {
        const leaves = await Leave.find({ studentId: child._id });

        return {
          childName: `${child.firstName} ${child.lastName}`,
          roomNumber: child.roomNumber,
          totalLeaves: leaves.length,
          pendingLeaves: leaves.filter((leave) => leave.status === "pending")
            .length,
          approvedLeaves: leaves.filter((leave) => leave.status === "approved")
            .length,
        };
      })
    );

    res.status(200).json({ children: childrenStats });
  } catch (error) {
    console.error("Error in getChildStats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChildInfo = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const child = await User.findOne({
      _id: { $in: parent.children },
      role: "student",
    }).select("-password");

    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    res.status(200).json(child);
  } catch (error) {
    console.error("Error in getChildInfo:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChildLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    // Find all children
    const children = await User.find({
      _id: { $in: parent.children },
      role: "student",
    });
    // console.log(children.length);

    // Get leaves for all children
    const leaves = await Leave.find({
      studentId: { $in: children.map((child) => child._id) },
    })
      .sort({ createdAt: -1 })
      .populate("studentId", "firstName lastName email")
      .populate("parentReview.reviewedBy", "firstName lastName")
      .populate("staffReview.reviewedBy", "firstName lastName");

    res.status(200).json({
      leaves,
      count: leaves.length
    });
  } catch (error) {
    console.error("Error in getChildLeaves:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getParentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    })
      .select("-password")
      .populate({
        path: "children",
        select: "-password",
        match: { role: "student" },
      });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    res.status(200).json(parent);
  } catch (error) {
    console.error("Error in getParentProfile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDashboardInfo = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const child = await User.findOne({
      _id: { $in: parent.children },
      role: "student",
    });

    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    // Get all required dashboard information
    const [recentLeaves] = await Promise.all([
      Leave.find({ studentId: child._id }).sort({ createdAt: -1 }).limit(5),
    ]);

    const dashboardInfo = {
      parent: await User.findById(parentId).select("-password"),
      child: child.toObject(),
      recentLeaves,
    };

    res.status(200).json(dashboardInfo);
  } catch (error) {
    console.error("Error in getDashboardInfo:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateParentProfile = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?._id;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.children;
    delete updates.role;

    const updatedParent = await User.findOneAndUpdate(
      { _id: parentId, role: "parent" },
      { $set: updates },
      { new: true }
    ).select("-password");

    if (!updatedParent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    res.status(200).json(updatedParent);
  } catch (error) {
    console.error("Error in updateParentProfile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reviewLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { action, remarks, currentParentLocation } = req.body;
    const parentId = req.user?._id;

    if (!parentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const parent = await User.findOne({ _id: parentId, role: "parent" });
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const leave = await Leave.findOne({
      _id: leaveId,
      studentId: { $in: parent.children },
    });

    if (!leave) {
      return res
        .status(404)
        .json({ message: "Leave not found or unauthorized" });
    }
    if (
      !currentParentLocation ||
      typeof currentParentLocation !== "object" ||
      !("coordinates" in currentParentLocation) ||
      !Array.isArray(currentParentLocation.coordinates) ||
      currentParentLocation.coordinates.length !== 2
    ) {
      return res
        .status(400)
        .json({ message: "Real-time parent location data is missing or invalid" });
    }
    const parentRealTimeLocation = currentParentLocation as IGeoLocation;
    if (
      !leave.leaveLocation ||
      typeof leave.leaveLocation !== "object" ||
      !("coordinates" in leave.leaveLocation)
    ) {
      return res.status(400).json({ message: "Leave location data is missing or invalid" });
    }

    const leaveLocation = leave.leaveLocation as IGeoLocation;

    if (!Array.isArray(leaveLocation.coordinates) || leaveLocation.coordinates.length !== 2) {
      return res.status(400).json({ message: "Leave location coordinates are missing or invalid" });
    }


    const distance = calculateDistance(
      parentRealTimeLocation.coordinates,
      leaveLocation.coordinates
    );
    const restrictedRadius = 5;

    if (distance < restrictedRadius && action === "approve") {
      return res.status(400).json({
        message:
          "Approval not allowed. Parent is within the restricted radius of the leave location.",
      });
    }
    if (leave.status !== "pending") {
      return res.status(400).json({ message: "Leave already reviewed" });
    }


    leave.parentReview = {
      status: action === "approve" ? "approved" : "rejected",
      remarks: remarks,
      reviewedBy: new mongoose.Types.ObjectId(parentId),
      reviewedAt: new Date(),
    };

    if (leave.staffReview?.status === "approved" && action === "approve") {
      leave.status = "approved";
    } else if (action === "reject") {
      leave.status = "rejected";
    } else {
      leave.status = "pending";
    }

    await leave.save();
    if (leave.status === "approved" || leave.status === "rejected") {
      leave.leaveLocation = undefined;
      await leave.save();
    }

    res.json({ message: `Leave ${action}ed by parent`, leave });
  } catch (error) {
    console.error("Error reviewing leave:", error);
    res.status(500).json({ message: "Failed to review leave" });
  }
};
