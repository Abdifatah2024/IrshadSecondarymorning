-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "familyVoucherId" INTEGER;

-- CreateTable
CREATE TABLE "public"."FamilyPaymentVoucher" (
    "id" SERIAL NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "parentUserId" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Cash',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "FamilyPaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyPaymentVoucher_voucherNo_key" ON "public"."FamilyPaymentVoucher"("voucherNo");

-- CreateIndex
CREATE INDEX "FamilyPaymentVoucher_parentUserId_idx" ON "public"."FamilyPaymentVoucher"("parentUserId");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_familyVoucherId_fkey" FOREIGN KEY ("familyVoucherId") REFERENCES "public"."FamilyPaymentVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyPaymentVoucher" ADD CONSTRAINT "FamilyPaymentVoucher_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyPaymentVoucher" ADD CONSTRAINT "FamilyPaymentVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
