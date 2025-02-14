import nodemailer from "nodemailer";
import User, { IUser } from "../models/user.model.js"; // Adjust based on your User model
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

// Generate reset token and save it to the user
export const generateResetToken = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  return { resetToken, user };
};

// Send reset password email
export const sendResetPasswordEmail = async (email: string) => {
  const { resetToken, user } = await generateResetToken(email);

  const resetLink = `${process.env.FRONTEND_LINK}/reset-password?token=${resetToken}`;

  // Email setup
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });

  const mailOptions = {
    to: email,
    from: "noreply@localhost",
    subject: "Password Reset Request",
    html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

// Reset user password
export const resetUserPassword = async (token: string, newPassword: string) => {
  // Find user by token and check if the token is valid (not expired)
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }


  // Hash the new password
  // const salt = await bcrypt.genSalt(10);
  // user.password = await bcrypt.hash(newPassword, salt);
  user.password = newPassword;
  // console.log("User found:", user);
  // console.log("New password hash:", user.password);
  // const isMatch = await user.comparePassword(password);
  // Clear the reset token and expiration
  user.resetPasswordToken = "";
  user.resetPasswordExpires = undefined;

  // Save the user document with the new password
  await user.save();

  // Optionally, log or return confirmation
  console.log("Password updated successfully.");
};
