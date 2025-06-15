/*
  Warnings:

  - The values [PUBLIC] on the enum `SchoolType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SchoolType_new" AS ENUM ('PRIVATE', 'PUBLICs', 'NOT_SPECIFIC');
ALTER TABLE "Student" ALTER COLUMN "previousSchoolType" DROP DEFAULT;
ALTER TABLE "Student" ALTER COLUMN "previousSchoolType" TYPE "SchoolType_new" USING ("previousSchoolType"::text::"SchoolType_new");
ALTER TYPE "SchoolType" RENAME TO "SchoolType_old";
ALTER TYPE "SchoolType_new" RENAME TO "SchoolType";
DROP TYPE "SchoolType_old";
ALTER TABLE "Student" ALTER COLUMN "previousSchoolType" SET DEFAULT 'NOT_SPECIFIC';
COMMIT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
