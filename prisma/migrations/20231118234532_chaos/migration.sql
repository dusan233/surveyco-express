/*
  Warnings:

  - You are about to drop the column `answer` on the `QuestionResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "QuestionResponse" DROP COLUMN "answer";

-- CreateTable
CREATE TABLE "QuestionAnswer" (
    "id" TEXT NOT NULL,
    "questionResponseId" TEXT NOT NULL,
    "questionOptionId" TEXT,
    "questionId" TEXT NOT NULL,
    "textAnswer" TEXT,

    CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionResponseId_fkey" FOREIGN KEY ("questionResponseId") REFERENCES "QuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionOptionId_fkey" FOREIGN KEY ("questionOptionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
