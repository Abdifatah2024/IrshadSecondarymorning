/*
  Warnings:

  - You are about to drop the column `orrectionLimit` on the `Score` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Score" DROP COLUMN "orrectionLimit",
ADD COLUMN     "correctionLimit" INTEGER NOT NULL DEFAULT 3;
