/*
  Warnings:

  - Added the required column `number` to the `QuestionOption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "number" INTEGER NOT NULL;
