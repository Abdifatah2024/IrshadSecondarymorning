/*
  Warnings:

  - The `status` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PARENT';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "parentUserId" INTEGER,
ALTER COLUMN "gender" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "StudentStatus" DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
