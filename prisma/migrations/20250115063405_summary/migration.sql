-- AlterTable
ALTER TABLE "Vulnerability" ADD COLUMN     "pluginOutput" TEXT DEFAULT 'null';

-- CreateTable
CREATE TABLE "VulnerabilitySummary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "osSummary" JSONB NOT NULL,
    "riskSummary" JSONB NOT NULL,
    "topDevices" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VulnerabilitySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VulnerabilitySummary_companyId_key" ON "VulnerabilitySummary"("companyId");

-- AddForeignKey
ALTER TABLE "VulnerabilitySummary" ADD CONSTRAINT "VulnerabilitySummary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
