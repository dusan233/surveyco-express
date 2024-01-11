/*
  Warnings:

  - Added the required column `display_number` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ip_address` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "display_number" INTEGER NOT NULL,
ADD COLUMN     "ip_address" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL;
