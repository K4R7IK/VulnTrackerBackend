/*
  Warnings:

  - Made the column `resolvedCount` on table `VulnerabilitySummary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unresolvedCount` on table `VulnerabilitySummary` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "VulnerabilitySummary" ALTER COLUMN "resolvedCount" SET NOT NULL,
ALTER COLUMN "unresolvedCount" SET NOT NULL;
