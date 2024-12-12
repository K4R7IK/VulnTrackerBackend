import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const quartersData = await prisma.vulnerability.findMany({
      where: { companyId },
      select: {
        quarter: true,
      },
    });

    const quarterSet = new Set();
    quartersData.forEach((vuln) => {
      vuln.quarter.forEach((q) => quarterSet.add(q));
    });

    const uniqueQuarters = Array.from(quarterSet).sort();
    res.status(200).json(uniqueQuarters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching quarters." });
  }
});
export default router;
