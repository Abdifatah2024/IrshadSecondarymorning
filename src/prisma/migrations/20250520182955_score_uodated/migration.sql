-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "correctionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastUpdatedBy" INTEGER;
