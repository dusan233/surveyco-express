/*
  Warnings:

  - Made the column `description` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description_image" DROP NOT NULL;
