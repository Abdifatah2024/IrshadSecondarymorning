-- AlterTable
ALTER TABLE "User" ADD COLUMN     "correctionLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "correctionsUsed" INTEGER NOT NULL DEFAULT 0;
