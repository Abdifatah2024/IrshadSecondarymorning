/*
  Warnings:

  - Made the column `academicYearId` on table `Score` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Score" DROP CONSTRAINT "Score_academicYearId_fkey";

-- AlterTable
ALTER TABLE "Score" ALTER COLUMN "academicYearId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
