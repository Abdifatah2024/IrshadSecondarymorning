-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "callNotes" TEXT,
ADD COLUMN     "callStatus" TEXT,
ADD COLUMN     "callTime" TIMESTAMP(3);
