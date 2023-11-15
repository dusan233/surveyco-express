/*
  Warnings:

  - You are about to drop the `SurveyResponseQuestionAnswer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SurveyResponseQuestionAnswer" DROP CONSTRAINT "SurveyResponseQuestionAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponseQuestionAnswer" DROP CONSTRAINT "SurveyResponseQuestionAnswer_surveyResponseId_fkey";

-- DropTable
DROP TABLE "SurveyResponseQuestionAnswer";

-- CreateTable
CREATE TABLE "QuestionResponse" (
    "id" TEXT NOT NULL,
    "surveyResponseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "QuestionResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
