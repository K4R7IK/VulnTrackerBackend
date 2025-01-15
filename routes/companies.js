import express from "express";
import { PrismaClient } from "@prisma/client";
import { validate as isUuid } from "uuid"; // UUID format validator
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();
const prisma = new PrismaClient();
/**
 * Unified Companies API
 * - GET /api/companies: Fetch all companies
 * - GET /api/companies/:id: Fetch a specific company by ID
 */
router.get("/:id?", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    if (id) {
      // Fetch a specific company by ID
      await fetchCompanyById(id, res);
    } else {
      // Fetch all companies
      await fetchAllCompanies(res);
    }
  } catch (error) {
    console.error("Error in Companies API:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Fetch all companies
 * @param {Response} res - Express response object
 */
async function fetchAllCompanies(res) {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }, // Select only necessary fields
    });

    if (companies.length === 0) {
      return res.status(404).json({ message: "No companies found." });
    }

    res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching all companies:", error.message);
    res.status(500).json({ message: "Failed to fetch companies." });
  }
}

/**
 * Fetch a specific company by ID
 * @param {string} id - Company ID
 * @param {Response} res - Express response object
 */
async function fetchCompanyById(id, res) {
  if (!isUuid(id)) {
    return res.status(400).json({ message: "Invalid company ID format." });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error(`Error fetching company with ID ${id}:`, error.message);
    res.status(500).json({ message: "Failed to fetch company details." });
  }
}

export default router;
