-- CreateEnum
CREATE TYPE "public"."OtpChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "public"."LoginOtp" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" "public"."OtpChannel" NOT NULL DEFAULT 'EMAIL',
    "destination" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginOtp_userId_idx" ON "public"."LoginOtp"("userId");

-- CreateIndex
CREATE INDEX "LoginOtp_expiresAt_idx" ON "public"."LoginOtp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "public"."EmailVerification"("token");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_idx" ON "public"."EmailVerification"("userId");

-- CreateIndex
CREATE INDEX "EmailVerification_expiresAt_idx" ON "public"."EmailVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
