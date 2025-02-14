import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import User from "../models/user.model.js";
import {
  generateResetToken,
  sendResetPasswordEmail,
  resetUserPassword,
} from "../services/ForgetPassword.service.js";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();
const key = process.env.ENCRYPTION_KEY || "";
const decryptPassword = (encryptedPassword: string): string => {

  const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};
export const login = async (req: Request, res: Response) => {
  try {
    const { email, Password } = req.body;

    const password = decryptPassword(Password);

    //  console.log("this is pass" + password);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      ...(user.roomNumber && { roomNumber: user.roomNumber }),
    };

    res.json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, roomNumber, children, location } =
      req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate role
    if (!["admin", "student", "staff", "parent"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role specified",
      });
    }

    // Create base user data
    const userData: any = {
      email,
      password,
      firstName,
      lastName,
      role,
    };
    if (location && location.type === "Point" && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      userData.location = location;
    } else {
      userData.location = undefined;
    }
    // Add role-specific fields ONLY
    switch (role) {
      case "student":
        if (!roomNumber) {
          return res.status(400).json({
            message: "Room number is required for students",
          });
        }
        userData.roomNumber = roomNumber;
        break;
      case "parent":
        userData.children = [];
        // Explicitly set parentId to undefined for parents
        userData.parentId = undefined;
        userData.roomNumber = undefined;
        break;
      default:
        // For admin and staff, ensure student/parent specific fields are undefined
        userData.children = undefined;
        userData.parentId = undefined;
        userData.roomNumber = undefined;
        userData.lo
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Prepare response data
    const responseData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    // Add role-specific fields to response
    if (role === "student") {
      Object.assign(responseData, { roomNumber: user.roomNumber });
    } else if (role === "parent") {
      Object.assign(responseData, { children: user.children });
    }

    res.status(201).json({
      token,
      user: responseData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Registration failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const { resetToken, user } = await generateResetToken(email);
    const resetLink = `https://hostel-frontend-fx5j.vercel.app/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user.email);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    await resetUserPassword(token, newPassword);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
