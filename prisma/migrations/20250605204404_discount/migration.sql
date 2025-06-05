-- AlterTable
ALTER TABLE "DiscountLog" ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "DiscountLog" ADD CONSTRAINT "DiscountLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountLog" ADD CONSTRAINT "DiscountLog_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountLog" ADD CONSTRAINT "DiscountLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
