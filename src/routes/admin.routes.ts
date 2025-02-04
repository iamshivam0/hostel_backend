import express from "express";
import multer from "multer";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  // Parent-Student Management
  assignParentToStudent,
  removeParentFromStudent,
  getStudentParentInfo,
  getAllStudents,
  getAllParents,
  createParent,
  updateParent,
  deleteParent,
  createAdmin,
  getstaff,
  getleaves,
  createStaff,
  deleteStaff,
  getleavesbyId,
  deleteleavebyid,
  editstudent,
  deleteStudent,
  getstudentbyid,
  updatePassword,
  getstaffbyid,
  updateStaff,
  getParentbyid,
} from "../controllers/admin.controller.js";
import {
  deleteComplaint,
  getComplaints,
} from "../controllers/Complaints.controller.js";
import { configureMulter } from "../middleware/upload.middleware.js";
import {
  deleteMessPhoto,
  getMessPhoto,
  uploadMessPhoto,
} from "../controllers/mess.controller.js";
import {
  AssignOrUpdateRoom,
  getAllRoommates,
} from "../controllers/RoomManagment.controller.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
} from "../controllers/Announcment.controller.js";
import { importOrUpdateUsersFromCSV } from "../controllers/CSV.controller.js";

const router = express.Router();

const messUpload = configureMulter("mess_photos");

const upload = multer({
  dest: "uploads/", // Temporary folder for uploaded files
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only CSV files are allowed")); // Reject the file
    }
    cb(null, true); // Accept the file
  },
});

// Protect all admin routes
router.use(authenticateToken, authorizeRoles(["admin"]));

// Admin Management
router.post("/create", createAdmin);

// Parent-Student Management Routes
router.get("/parents", getAllParents);
router.get("/student-parent/:studentId", getStudentParentInfo);
router.get("/complaints", getComplaints);

// Parent Management
router.post("/parent", createParent);
router.put("/parent/:id", updateParent);
router.delete("/parent/:id", deleteParent);
router.get("/parent/:id", getParentbyid);
// Parent-Student Assignment
router.post("/assign-parent", assignParentToStudent);
router.delete("/remove-parent/:studentId", removeParentFromStudent);

router.delete("/deletecomplaint/:id", deleteComplaint);

// staff management
router.get("/getallstaffs", getstaff);
router.post("/staff-create", createStaff);
router.delete("/delete-staff/:id", deleteStaff);
router.get("/staff/:id", getstaffbyid);
router.put("/staff/edit/:id", updateStaff);

//leave management

router.get("/getallleaves", getleaves);
router.get("/getstudentleaveid/:id", getleavesbyId)
router.delete("/delete-leave/:id", deleteleavebyid);
//Mess-upload

router.post(
  "/upload-mess-menu",
  messUpload.single("messPhoto"),
  uploadMessPhoto
);
router.get("/mess-menu", getMessPhoto);
router.delete("/delete-menu", deleteMessPhoto);

//room managment routes

router.get("/get-All-Roomamtes", getAllRoommates);
router.post("/assign-room", AssignOrUpdateRoom);
router.post("/update-room", AssignOrUpdateRoom);

//routes for announcments

router.get("/getadminannouncment", getAllAnnouncements);
router.post("/createadminannouncment", createAnnouncement);
router.put("/update-announcment/:type/:id", updateAnnouncement);

// Delete an announcement (type: student/general)
router.delete("/delete-announcment/:type/:id", deleteAnnouncement);

// CSV import Routes

// Route to handle CSV upload and import
router.post("/import-csv", upload.single("file"), importOrUpdateUsersFromCSV);


//student admin routes 
router.get("/students", getAllStudents);
router.put("/student/:id", editstudent);
router.delete("/delete-student/:id", deleteStudent);
router.get("/student/:id", getstudentbyid);


//common 
router.put("/updatepasswords/:id", updatePassword);
export default router;