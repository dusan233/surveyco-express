/*
  Warnings:

  - Added the required column `deleted` to the `SurveyCollector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyCollector" ADD COLUMN     "deleted" BOOLEAN NOT NULL;
