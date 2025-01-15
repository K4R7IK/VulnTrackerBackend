import express from "express";
import { PrismaClient } from "@prisma/client";
import { validate as isUuid } from "uuid";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get quarters for a specific company or all companies
 * - GET /api/quarters: Fetch quarters for all companies consolidated
 * - GET /api/quarters/:id: Fetch quarters for a specific company
 */
router.get("/:id?", async (req, res) => {
  const { id } = req.params;

  try {
    if (id) {
      // Validate the ID if provided
      if (!isUuid(id)) {
        return res.status(400).json({ message: "Invalid company ID format." });
      }

      // Fetch quarters for a specific company
      const quartersData = await prisma.vulnerability.findMany({
        where: { companyId: id },
        select: { quarter: true },
      });

      const uniqueQuarters = [...new Set(quartersData.flatMap((vuln) => vuln.quarter))].sort();
      return res.status(200).json({ quarters: uniqueQuarters });
    } else {
      // Fetch quarters for all companies
      const allQuartersData = await prisma.vulnerability.findMany({
        select: { quarter: true },
      });

      const consolidatedQuarters = [...new Set(allQuartersData.flatMap((vuln) => vuln.quarter))].sort();
      return res.status(200).json({ quarters: consolidatedQuarters });
    }
  } catch (error) {
    console.error("Error fetching quarters:", error.message);
    res.status(500).json({ message: "Error fetching quarters." });
  }
});

export default router;
