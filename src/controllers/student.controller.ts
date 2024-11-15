import { Request, Response } from "express";
import Leave from "../models/leave.model.js";
import User from "../models/user.model.js";

// Get student profile
export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const student = await User.findById(studentId).select("-password").lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ message: "Failed to fetch student profile" });
  }
};

// Get student's leave statistics
export const getStudentLeaveStats = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leaves = await Leave.find({ studentId });

    const stats = leaves.reduce(
      (acc, leave) => {
        acc.total++;
        switch (leave.status.toLowerCase()) {
          case "pending":
            acc.pending++;
            break;
          case "approved":
            acc.approved++;
            break;
          case "rejected":
            acc.rejected++;
            break;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, total: 0 }
    );

    res.json(stats);
  } catch (error) {
    console.error("Error fetching leave statistics:", error);
    res.status(500).json({ message: "Failed to fetch leave statistics" });
  }
};

// Get student's leaves
export const getStudentLeaves = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leaves = await Leave.find({ studentId })
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "firstName lastName");

    res.json(leaves);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ message: "Failed to fetch leaves" });
  }
};

// Submit leave application
export const submitLeave = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      startDate,
      endDate,
      reason,
      leaveType,
      contactNumber,
      parentContact,
      address,
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      studentId,
      status: { $ne: "rejected" },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlappingLeave) {
      return res.status(400).json({
        message: "You already have a leave application for these dates",
      });
    }

    const leave = new Leave({
      studentId,
      startDate,
      endDate,
      reason,
      leaveType,
      contactNumber,
      parentContact,
      address,
      status: "pending",
    });

    await leave.save();

    res.status(201).json(leave);
  } catch (error) {
    console.error("Error submitting leave:", error);
    res.status(500).json({ message: "Failed to submit leave application" });
  }
};

// Update student profile
export const updateStudentProfile = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { firstName, lastName, email, roomNumber } = req.body;

    const student = await User.findByIdAndUpdate(
      studentId,
      { firstName, lastName, email, roomNumber },
      { new: true }
    ).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Get student's dashboard data
export const getStudentDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get student profile
    const student = await User.findById(studentId).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get leave statistics
    const leaves = await Leave.find({ studentId });
    const stats = leaves.reduce(
      (acc, leave) => {
        acc.total++;
        switch (leave.status.toLowerCase()) {
          case "pending":
            acc.pending++;
            break;
          case "approved":
            acc.approved++;
            break;
          case "rejected":
            acc.rejected++;
            break;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, total: 0 }
    );

    // Get recent leaves
    const recentLeaves = await Leave.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reviewedBy", "firstName lastName");

    res.json({
      student,
      stats,
      recentLeaves,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

// Add this new function to handle password changes
export const changeStudentPassword = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;

    // Find the student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Verify current password
    const isMatch = await student.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password
    student.password = newPassword;
    await student.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// Get student's roommates
export const getStudentRoomates = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // First, get the current student's room number
    const currentStudent = await User.findById(studentId);
    if (!currentStudent || !currentStudent.roomNumber) {
      return res
        .status(404)
        .json({ message: "Student or room number not found" });
    }

    // Find all students with the same room number, excluding the current student
    const roommates = await User.find({
      _id: { $ne: studentId }, // Exclude current student
      role: "student",
      roomNumber: currentStudent.roomNumber,
    })
      .select("firstName lastName email roomNumber") // Select only necessary fields
      .lean();

    res.json({
      roomNumber: currentStudent.roomNumber,
      roommates: roommates,
    });
  } catch (error) {
    console.error("Error fetching roommates:", error);
    res.status(500).json({ message: "Failed to fetch roommates" });
  }
};
