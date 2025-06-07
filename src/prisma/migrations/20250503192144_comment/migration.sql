-- CreateTable
CREATE TABLE "DisciplineComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disciplineId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DisciplineComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DisciplineComment" ADD CONSTRAINT "DisciplineComment_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplineComment" ADD CONSTRAINT "DisciplineComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
