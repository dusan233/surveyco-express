/*
  Warnings:

  - Made the column `questionOptionId` on table `QuestionAnswer` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "QuestionAnswer" DROP CONSTRAINT "QuestionAnswer_questionOptionId_fkey";

-- AlterTable
ALTER TABLE "QuestionAnswer" ALTER COLUMN "questionOptionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionOptionId_fkey" FOREIGN KEY ("questionOptionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
