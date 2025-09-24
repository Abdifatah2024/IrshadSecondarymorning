/*
  Warnings:

  - The `STUDID` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[STUDID]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Student" DROP COLUMN "STUDID",
ADD COLUMN     "STUDID" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Student_STUDID_key" ON "public"."Student"("STUDID");
