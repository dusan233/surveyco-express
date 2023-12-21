/*
  Warnings:

  - Added the required column `surveyId` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "surveyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
