import express from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/authenticateToken.js"; // JWT middleware
import { validate as isUuid } from "uuid"; // To validate UUID format

const router = express.Router();
const prisma = new PrismaClient();

// Fetch a specific company by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID format (assuming UUIDs are used as IDs)
    if (!isUuid(id)) {
      return res.status(400).json({ message: "Invalid company ID format" });
    }

    // Fetch company by ID
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }, // Only return specific fields
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
