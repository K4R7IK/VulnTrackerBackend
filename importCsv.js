import fs from "fs";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const prisma = new PrismaClient();

// Generate a unique hash
function generateHash(companyId, ...fields) {
  return crypto
    .createHash("md5")
    .update([companyId, ...fields].join("|"))
    .digest("hex");
}

async function updateSummary(companyId) {
  // Fetch vulnerabilities for the company
  const vulnerabilities = await prisma.vulnerability.findMany({
    where: { companyId },
  });

  // Summarize vulnerabilities by OS
  const osSummary = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.assetOS] = (acc[vuln.assetOS] || 0) + 1;
    return acc;
  }, {});

  // Summarize vulnerabilities by risk
  const riskSummary = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.riskLevel] = (acc[vuln.riskLevel] || 0) + 1;
    return acc;
  }, {});

  // Identify devices with the highest vulnerabilities
  const deviceVulnCount = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.assetIp] = (acc[vuln.assetIp] || 0) + 1;
    return acc;
  }, {});
  const topDevices = Object.entries(deviceVulnCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ip, count]) => ({ ip, count }));

  // Save or update the summary in the database
  await prisma.vulnerabilitySummary.upsert({
    where: { companyId },
    update: { osSummary, riskSummary, topDevices },
    create: { companyId, osSummary, riskSummary, topDevices },
  });
}

export async function importCsv(filepath, quarterValue, companyName) {
  try {
    const results = [];

    // Read and parse the CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filepath)
        .pipe(csv({ separator: "," }))
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    // Start transaction
    await prisma.$transaction(async (prisma) => {
      // Fetch or create the company
      const company = await prisma.company.upsert({
        where: { name: companyName },
        update: {},
        create: { id: uuidv4(), name: companyName },
      });
      const companyId = company.id;

      // Prepare vulnerabilities from CSV
      const csvVulnMap = new Map();

      results.forEach((row) => {
        if (row["Risk"] === "None") return;

        const uniqueHash = generateHash(
          companyId,
          row["Host"],
          row["Port"],
          row["Name"],
          row["CVE"],
          row["Description"],
          row["Risk"],
          row["CVSS v2.0 Base Score"],
          row["Synopsis"],
          row["Solution"],
          row["See Also"],
        );

        if (!csvVulnMap.has(uniqueHash)) {
          csvVulnMap.set(uniqueHash, {
            assetIp: row["Host"],
            assetOS: row["Asset OS"] || null,
            port: parseInt(row["Port"], 10) || null,
            protocol: row["Protocol"] ? row["Protocol"].toUpperCase() : null,
            title: row["Name"],
            cveId: row["CVE"] ? row["CVE"].split(",") : [],
            description: row["Description"]
              ? row["Description"].split("\n")
              : [],
            riskLevel: row["Risk"],
            cvssScore: parseFloat(row["CVSS v2.0 Base Score"]) || 0,
            impact: row["Synopsis"],
            recommendations: row["Solution"],
            references: row["See Also"] ? row["See Also"].split(",") : [],
            quarter: [quarterValue],
            uniqueHash,
            companyId,
            isResolved: false,
          });
        }
      });

      const csvHashes = Array.from(csvVulnMap.keys());

      // Fetch existing vulnerabilities from the database
      const existingVulnerabilities = await prisma.vulnerability.findMany({
        where: { companyId },
      });

      const existingHashes = new Set(
        existingVulnerabilities.map((v) => v.uniqueHash),
      );

      // Update existing vulnerabilities
      const updatePromises = existingVulnerabilities
        .filter((vuln) => csvHashes.includes(vuln.uniqueHash))
        .map((vuln) => {
          const csvVuln = csvVulnMap.get(vuln.uniqueHash);
          const updatedQuarters = Array.from(
            new Set([...vuln.quarter, ...csvVuln.quarter]),
          );

          csvVulnMap.delete(vuln.uniqueHash); // Remove from CSV map after processing

          return prisma.vulnerability.update({
            where: { id: vuln.id },
            data: {
              isResolved: false,
              quarter: updatedQuarters,
              updatedAt: new Date(),
            },
          });
        });

      await Promise.all(updatePromises);

      // Mark unmatched database records as resolved
      const unmatchedDbRecords = existingVulnerabilities.filter(
        (vuln) => !csvHashes.includes(vuln.uniqueHash),
      );

      const resolvePromises = unmatchedDbRecords.map((vuln) =>
        prisma.vulnerability.update({
          where: { id: vuln.id },
          data: { isResolved: true },
        }),
      );

      await Promise.all(resolvePromises);

      // Insert new vulnerabilities
      const newVulnerabilities = Array.from(csvVulnMap.values());
      if (newVulnerabilities.length > 0) {
        await prisma.vulnerability.createMany({
          data: newVulnerabilities,
          skipDuplicates: true,
        });
      }

      console.log("Import complete:");
      console.log(`Updated: ${updatePromises.length}`);
      console.log(`Resolved: ${resolvePromises.length}`);
      console.log(`Inserted: ${newVulnerabilities.length}`);
    });
  } catch (error) {
    console.error("Error importing vulnerabilities:", error);
    throw error;
  } finally {
    if (companyId) {
      try {
        await updateSummary(companyId);
      } catch (summaryError) {
        console.error("Error updating summary:", summaryError);
      }
    }
    await prisma.$disconnect();
  }
}
