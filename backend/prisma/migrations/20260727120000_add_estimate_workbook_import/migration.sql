-- CreateEnum
CREATE TYPE "EstimateLineRowType" AS ENUM ('SECTION', 'WORK', 'RESOURCE', 'SUBTOTAL', 'TOTAL');

-- AlterTable
ALTER TABLE "estimates" ADD COLUMN "workbookPreviewJson" TEXT;

-- AlterTable
ALTER TABLE "estimate_lines"
ADD COLUMN "formulaRaw" TEXT,
ADD COLUMN "normCodeRaw" TEXT,
ADD COLUMN "parentLineId" TEXT,
ADD COLUMN "resourceCodeRaw" TEXT,
ADD COLUMN "rowType" "EstimateLineRowType" NOT NULL DEFAULT 'WORK',
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sourceRowNumber" INTEGER,
ADD COLUMN "sourceSerialRaw" TEXT,
ADD COLUMN "sourceSheet" TEXT,
ADD COLUMN "unitLabelRaw" TEXT;

-- AddForeignKey
ALTER TABLE "estimate_lines"
ADD CONSTRAINT "estimate_lines_parentLineId_fkey"
FOREIGN KEY ("parentLineId") REFERENCES "estimate_lines"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
