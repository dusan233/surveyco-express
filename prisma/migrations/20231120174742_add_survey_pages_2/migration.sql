/*
  Warnings:

  - Added the required column `number` to the `SurveyPage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surveyId` to the `SurveyPage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyPage" ADD COLUMN     "number" INTEGER NOT NULL,
ADD COLUMN     "surveyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SurveyPage" ADD CONSTRAINT "SurveyPage_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
