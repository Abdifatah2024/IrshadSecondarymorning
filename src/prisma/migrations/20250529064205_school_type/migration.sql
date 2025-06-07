-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIVATE', 'PUBLIC', 'NOT_SPECIFIC');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "previousSchoolType" "SchoolType" NOT NULL DEFAULT 'NOT_SPECIFIC';
