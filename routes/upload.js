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

// POST route to upload and process CSV files
router.post(
  "/",
  authenticateToken, // Protect the route with JWT authentication
  upload.single("file"),
  async (req, res) => {
    const { quarter, companyName } = req.body;

    // Ensure required fields are provided
    if (!quarter || !companyName) {
      return res.status(400).json({ message: "Quarter and company name are required." });
    }

    const filepath = req.file?.path;

    if (!filepath) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      // Import the CSV data
      await importCsv(filepath, quarter, companyName);

      // Cleanup: Remove the uploaded file after processing
      await fs.unlink(filepath);

      res.status(200).json({ message: "File processed successfully." });
    } catch (error) {
      console.error("Error processing file:", error);

      // Cleanup: Remove the file in case of an error
      if (filepath) {
        await fs.unlink(filepath);
      }

      res.status(500).json({ message: "Error processing file." });
    }
  }
);

export default router;
