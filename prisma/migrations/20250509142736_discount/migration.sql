-- CreateTable
CREATE TABLE "DiscountLog" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentFeeId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountLog_studentId_idx" ON "DiscountLog"("studentId");

-- CreateIndex
CREATE INDEX "DiscountLog_studentFeeId_idx" ON "DiscountLog"("studentFeeId");

-- CreateIndex
CREATE INDEX "DiscountLog_month_year_idx" ON "DiscountLog"("month", "year");
