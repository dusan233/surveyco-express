/*
  Warnings:

  - Added the required column `required` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "randomize" BOOLEAN,
ADD COLUMN     "required" BOOLEAN NOT NULL;
