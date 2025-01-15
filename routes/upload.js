import express from "express";
import multer from "multer";
import { importCsv } from "../importCsv.js";
import authenticateToken from "../middleware/authenticateToken.js";
import fs from "fs/promises";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed."));
    }
  },
});

/**
 * Upload and process CSV files
 */
router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  const { quarter, companyName } = req.body;
  const filepath = req.file?.path;

  if (!quarter || !companyName) {
    return res.status(400).json({ message: "Quarter and company name are required." });
  }

  if (!filepath) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    await importCsv(filepath, quarter, companyName);
    await fs.unlink(filepath); // Clean up the uploaded file
    res.status(200).json({ message: "File processed successfully." });
  } catch (error) {
    console.error("Error processing file:", error.message);
    await fs.unlink(filepath); // Cleanup in case of errors
    res.status(500).json({ message: "Error processing file." });
  }
});

export default router;
