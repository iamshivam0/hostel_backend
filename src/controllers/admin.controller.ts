import { Request, Response } from "express";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import Leave from "../models/leave.model.js";

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new admin user
    const admin = new User({
      email,
      password,
      firstName,
      lastName,
      role: "admin",
    });

    await admin.save();

    res.status(201).json({
      message: "Admin user created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create admin user" });
  }
};

export const assignParentToStudent = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentId, parentId } = req.body;

    if (!studentId || !parentId) {
      return res.status(400).json({
        success: false,
        message: "Both studentId and parentId are required",
      });
    }

    // Verify both users exist and have correct roles
    const student = await User.findOne({
      _id: studentId,
      role: "student",
    });

    const parent = await User.findOne({
      _id: parentId,
      role: "parent",
    });

    if (!student || !parent) {
      return res.status(404).json({
        success: false,
        message: "Student or parent not found or invalid roles",
      });
    }

    // Check if student already has a parent
    if (student.parentId) {
      return res.status(400).json({
        success: false,
        message: "Student already has a parent assigned",
      });
    }

    try {
      // Update student with parent reference
      await User.findByIdAndUpdate(
        studentId,
        { parentId: parentId },
        { session }
      );

      // Add student to parent's children array if not already present
      await User.findByIdAndUpdate(
        parentId,
        {
          $addToSet: { children: studentId },
        },
        { session }
      );

      await session.commitTransaction();

      // Fetch updated data
      const updatedStudent = await User.findById(studentId)
        .select("firstName lastName email roomNumber parentId")
        .populate("parentId", "firstName lastName email");

      // Return updated data
      return res.status(200).json({
        success: true,
        message: "Student successfully assigned to parent",
        data: updatedStudent,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error in assignParentToStudent:", error);
    return res.status(500).json({
      success: false,
      message: "Error assigning student to parent",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const removeParentFromStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: "student" });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!student.parentId) {
      return res.status(400).json({
        success: false,
        message: "Student doesn't have a parent assigned",
      });
    }

    // Remove student from parent's children array
    await User.updateOne(
      { _id: student.parentId },
      { $pull: { children: studentId } }
    );

    // Remove parent reference from student
    student.parentId = undefined;
    await student.save();

    return res.status(200).json({
      success: true,
      message: "Parent-student relationship removed successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error removing parent-student relationship",
      error: error.message,
    });
  }
};

export const getStudentParentInfo = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: "student" })
      .populate("parentId", "firstName lastName email")
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
        },
        parent: student.parentId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching student-parent information",
      error: error.message,
    });
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const students = await User.find({ role: "student" })
      .select("firstName lastName email parentId roomNumber")
      .populate("parentId", "firstName lastName email")
      .lean();

    res.status(200).json(students);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
};

export const getAllParents = async (req: Request, res: Response) => {
  try {
    const parents = await User.find({ role: "parent" })
      .select("firstName lastName email children")
      .populate("children", "firstName lastName email roomNumber")
      .lean();

    res.status(200).json(parents);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching parents",
      error: error.message,
    });
  }
};

export const createParent = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if parent already exists
    const existingParent = await User.findOne({ email });
    if (existingParent) {
      return res.status(400).json({
        success: false,
        message: "Parent with this email already exists",
      });
    }

    // Create new parent
    const parent = new User({
      email,
      password,
      firstName,
      lastName,
      role: "parent",
    });

    await parent.save();

    return res.status(201).json({
      success: true,
      message: "Parent created successfully",
      data: {
        id: parent._id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error creating parent",
      error: error.message,
    });
  }
};

export const updateParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    const parent = await User.findOneAndUpdate(
      { _id: id, role: "parent" },
      { email, firstName, lastName },
      { new: true }
    ).select("-password");

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Parent updated successfully",
      data: parent,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error updating parent",
      error: error.message,
    });
  }
};

export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const parent = await User.findOne({ _id: id, role: "parent" });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found",
      });
    }

    // Remove parent reference from all children
    if (parent.children && parent.children.length > 0) {
      await User.updateMany(
        { _id: { $in: parent.children } },
        { $unset: { parentId: "" } }
      );
    }

    await parent.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Parent deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error deleting parent",
      error: error.message,
    });
  }
};

export const getstaff = async (req: Request, res: Response) => {
  try {
    const staff = await User.find({ role: { $regex: /^staff$/i } })
      .select("firstName lastName email ")
      .lean();

    res.status(200).json(staff);
    // console.log(await User.find({ role: "staff" }));
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error fetching staff",
      error: error.message,
    });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if staff already exists
    const existingStaff = await User.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "staff with this email already exists",
      });
    }

    // Create new staff
    const staff = new User({
      email,
      password,
      firstName,
      lastName,
      role: "staff",
    });

    await staff.save();

    return res.status(201).json({
      success: true,
      message: "staff created successfully",
      data: {
        id: staff._id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error creating staff",
      error: error.message,
    });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ _id: id, role: "staff" });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "staff not found",
      });
    }

    await staff.deleteOne();

    return res.status(200).json({
      success: true,
      message: "staff deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error deleting staff",
      error: error.message,
    });
  }
};

export const getleaves = async (req: Request, res: Response) => {
  try {
    const leaves = await Leave.find({})
      .sort({ createdAt: -1 })
      .populate("studentId", "firstName lastName email")
      .populate("parentReview.reviewedBy", "firstName lastName")
      .populate("staffReview.reviewedBy", "firstName lastName");

    res.json(leaves);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ message: "Failed to fetch leaves" });
  }
};
export const getleavesbyId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID parameter is required" });
    }

    // Find a leave by ID
    const leave = await Leave.findById(id)
      .populate("studentId", "firstName lastName email")
      .populate("parentReview.reviewedBy", "firstName lastName")
      .populate("staffReview.reviewedBy", "firstName lastName");

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    res.json(leave);
  } catch (error) {
    console.error("Error fetching leave by ID:", error);
    res.status(500).json({ message: "Failed to fetch leave" });
  }
};

export const deleteleavebyid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // console.log(id);

    const leave = await Leave.findOne({ _id: id });
    // console.log(leave);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "leave not found",
      });
    }

    await leave.deleteOne();

    return res.status(200).json({
      success: true,
      message: "leave deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error deleting leave",
      error: error.message,
    });
  }
}