import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Generate or Update Vulnerability Summary
 */
router.post("/generate", async (req, res) => {
  const { companyId } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required." });
  }

  try {
    // Fetch unresolved vulnerabilities for the company
    const unresolvedVulnerabilities = await prisma.vulnerability.findMany({
      where: { companyId, isResolved: false },
    });

    // Fetch resolved and unresolved counts
    const [resolvedCount, unresolvedCount] = await Promise.all([
      prisma.vulnerability.count({ where: { companyId, isResolved: true } }),
      prisma.vulnerability.count({ where: { companyId, isResolved: false } }),
    ]);

    // Summarize unresolved vulnerabilities
    const osSummary = unresolvedVulnerabilities.reduce((acc, vuln) => {
      acc[vuln.assetOS] = (acc[vuln.assetOS] || 0) + 1;
      return acc;
    }, {});

    const riskSummary = unresolvedVulnerabilities.reduce((acc, vuln) => {
      acc[vuln.riskLevel] = (acc[vuln.riskLevel] || 0) + 1;
      return acc;
    }, {});

    const deviceVulnCount = unresolvedVulnerabilities.reduce((acc, vuln) => {
      acc[vuln.assetIp] = (acc[vuln.assetIp] || 0) + 1;
      return acc;
    }, {});

    const topDevices = Object.entries(deviceVulnCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Save or update the summary in the database
    const summary = await prisma.vulnerabilitySummary.upsert({
      where: { companyId },
      update: { osSummary, riskSummary, topDevices, resolvedCount, unresolvedCount },
      create: { companyId, osSummary, riskSummary, topDevices, resolvedCount, unresolvedCount },
    });

    res.status(200).json({ message: "Summary generated successfully.", summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ message: "Error generating summary." });
  }
});

/**
 * Fetch Vulnerability Summary for a Company
 */
router.get("/:companyId", async (req, res) => {
  const { companyId } = req.params;

  try {
    const summary = await prisma.vulnerabilitySummary.findUnique({
      where: { companyId },
    });

    if (!summary) {
      return res.status(404).json({ message: "Summary not found for the company." });
    }

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Error fetching summary." });
  }
});

export default router;
