-- CreateTable
CREATE TABLE "StudentDeletionLog" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" INTEGER,
    "restoredBy" INTEGER,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "StudentDeletionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudentDeletionLog" ADD CONSTRAINT "StudentDeletionLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeletionLog" ADD CONSTRAINT "fk_deleted_by_user_custom" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeletionLog" ADD CONSTRAINT "fk_restored_by_user" FOREIGN KEY ("restoredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDeletionLog" ADD CONSTRAINT "StudentDeletionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
