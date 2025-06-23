/*
  Warnings:

  - A unique constraint covering the columns `[rollNumber]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `district` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentEmail` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userid_fkey";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "academicYearId" INTEGER DEFAULT 1,
ADD COLUMN     "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "parentEmail" TEXT NOT NULL,
ADD COLUMN     "registeredById" INTEGER DEFAULT 1,
ADD COLUMN     "rollNumber" TEXT,
ADD COLUMN     "transfer" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userid" DROP NOT NULL,
ALTER COLUMN "userid" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "Student"("rollNumber");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
