import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  getStaffProfile,
  getStaffLeaveStats,
  getAllLeaves,
  getPendingLeaves,
  reviewLeave,
  getStaffDashboard,
  changestaffPassword,
} from "../controllers/staff.controller.js";
import { getComplaints } from "../controllers/Complaints.controller.js";
import { validateLeaveReview } from "../middleware/leave.middleware.js";
import { configureMulter } from "../middleware/upload.middleware.js";
import {
  getMessPhoto,
  uploadMessPhoto,
} from "../controllers/mess.controller.js";
import {
  getGeneralAnnouncements,
  postGeneralAnnouncement,
} from "../controllers/Announcment.controller.js";

const router = express.Router();

const messUpload = configureMulter("mess_photos");

// Add interface for authenticated request
interface AuthenticatedRequest extends express.Request {
  user?: {
    _id: string;
    role: string;
  };
}

// Staff profile routes
router.get(
  "/profile",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getStaffProfile
);

// Leave management routes
router.get(
  "/leaves",
  authenticateToken,
  authorizeRoles(["staff"]),
  getAllLeaves
);

router.get(
  "/leaves/pending",
  authenticateToken,
  authorizeRoles(["staff", "admin"]),
  getPendingLeaves
);

router.post(
  "/leaves/:leaveId/review",
  authenticateToken,
  authorizeRoles(["staff", "admin"]),
  validateLeaveReview,
  reviewLeave
);

// Other routes remain the same...
router.get(
  "/leave-stats",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getStaffLeaveStats
);

router.get(
  "/dashboard",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getStaffDashboard
);

router.put(
  "/change-password",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  changestaffPassword
);

router.get(
  "/complaints",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getComplaints
);

// mess-controls

router.post(
  "/upload-mess-menu",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  messUpload.single("messPhoto"),
  uploadMessPhoto
);
router.get(
  "/mess-menu",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getMessPhoto
);

// room controls

// router.get("/get-All-Roomamtes", authenticateToken as any,
//   authorizeRoles(["staff"]), getAllRoommates);
// router.post("/assign-room", authenticateToken as any,
//   authorizeRoles(["staff"]), AssignOrUpdateRoom);
// router.post("/update-room", authenticateToken as any,
//   authorizeRoles(["staff"]), AssignOrUpdateRoom);

//Aanouncments controls
router.get(
  "/getstaffAnnouncments",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  getGeneralAnnouncements
);
router.post(
  "/create-staffAanouncments",
  authenticateToken as any,
  authorizeRoles(["staff"]),
  postGeneralAnnouncement
);
export default router;