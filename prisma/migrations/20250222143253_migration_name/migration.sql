-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'Teacher');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
