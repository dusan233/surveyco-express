/*
  Warnings:

  - Added the required column `surveyPageId` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "surveyPageId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SurveyPage" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "SurveyPage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_surveyPageId_fkey" FOREIGN KEY ("surveyPageId") REFERENCES "SurveyPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
