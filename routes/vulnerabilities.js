import express from "express";
import { PrismaClient } from "@prisma/client";
import { differenceInDays } from "date-fns";
import authenticateToken from "../middleware/authenticateToken.js"; // JWT Middleware

const router = express.Router();
const prisma = new PrismaClient();

// Fetch vulnerabilities with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      companyId,
      quarter,
      isResolved,
      quarterNot,
    } = req.query;

    // Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters." });
    }

    // Ensure non-admins can only access their company's vulnerabilities
    if (req.user.role !== "Admin" && req.user.companyId !== companyId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const skip = (page - 1) * limit;

    // Build the query filters
    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { assetIp: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(companyId && { companyId }),
      ...(quarter && { quarter: { has: quarter } }),
      ...(quarterNot && { NOT: { quarter: { has: quarterNot } } }),
      ...(isResolved !== undefined && { isResolved: isResolved === "true" }),
    };

    // Fetch vulnerabilities and total count
    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: { company: true },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    // Calculate "Age" in days
    const vulnerabilitiesWithAge = vulnerabilities.map((vuln) => {
      const currentDate = new Date();
      const createdDate = new Date(vuln.updatedAt); // Change to `createdAt` if needed

      // Calculate difference in days
      const ageInDays = differenceInDays(currentDate, createdDate) + 1;

      return {
        ...vuln,
        age: `${ageInDays} days`,
      };
    });

    // Send response
    res.status(200).json({
      data: vulnerabilitiesWithAge,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching vulnerabilities:", error);
    res.status(500).json({ message: "Error fetching vulnerabilities." });
  }
});

export default router;

