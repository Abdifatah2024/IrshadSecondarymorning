-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "photoUrl" TEXT DEFAULT 'Null';
