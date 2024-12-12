import express from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/authenticateToken.js"; // Import JWT middleware

const router = express.Router();
const prisma = new PrismaClient();

// Route to fetch all companies
router.get("/", authenticateToken, async (req, res) => {
  try {
    // Fetch companies from the database
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }, // Only fetch id and name
    });

    // Send the response
    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Error fetching companies." });
  }
});

export default router;
