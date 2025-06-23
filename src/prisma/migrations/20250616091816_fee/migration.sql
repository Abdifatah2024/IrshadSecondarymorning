/*
  Warnings:

  - Made the column `student_fee` on table `StudentFee` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StudentFee" ALTER COLUMN "student_fee" SET NOT NULL;
