import express from "express";
import { PrismaClient } from "@prisma/client";
import { differenceInDays } from "date-fns";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Fetch vulnerabilities with filters and pagination
 */
router.get("/", authenticateToken, async (req, res) => {
  const { page = 1, limit = 50, search = "", companyId, quarter, isResolved, quarterNot } = req.query;

  if (!companyId && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied. Specify a companyId." });
  }

  try {
    const skip = (page - 1) * limit;

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

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: { company: true },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    const vulnerabilitiesWithAge = vulnerabilities.map((vuln) => ({
      ...vuln,
      age: `${differenceInDays(new Date(), new Date(vuln.updatedAt)) + 1} days`,
    }));

    res.status(200).json({
      data: vulnerabilitiesWithAge,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching vulnerabilities:", error.message);
    res.status(500).json({ message: "Error fetching vulnerabilities." });
  }
});

export default router;
