-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastResetRequestAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetRequestCount" INTEGER NOT NULL DEFAULT 0;
