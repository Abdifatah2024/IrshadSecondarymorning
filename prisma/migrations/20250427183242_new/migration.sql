/*
  Warnings:

  - You are about to drop the column `Amount` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "Amount",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "bus" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "previousSchool" TEXT;
