-- CreateTable
CREATE TABLE "WorkPlanComment" (
    "id" SERIAL NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'To Do',
    "workPlanId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPlanComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkPlanComment" ADD CONSTRAINT "WorkPlanComment_workPlanId_fkey" FOREIGN KEY ("workPlanId") REFERENCES "WorkPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlanComment" ADD CONSTRAINT "WorkPlanComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
