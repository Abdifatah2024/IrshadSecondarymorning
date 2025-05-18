/*
  Warnings:

  - You are about to drop the column `FeeId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Payment` table. All the data in the column will be lost.
  - You are about to alter the column `amountPaid` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `discount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `fee` on the `Student` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `amount` on the `StudentFee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,month,year]` on the table `StudentFee` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_FeeId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFee" DROP CONSTRAINT "StudentFee_userId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "FeeId",
DROP COLUMN "balance",
DROP COLUMN "month",
DROP COLUMN "year",
ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "discount" SET DEFAULT 0.0,
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "fee" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "StudentFee" DROP COLUMN "amount",
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "studentFeeId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "studentId" INTEGER,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAccount" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "carryForward" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAccount_studentId_key" ON "StudentAccount"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFee_studentId_month_year_key" ON "StudentFee"("studentId", "month", "year");

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccount" ADD CONSTRAINT "StudentAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
