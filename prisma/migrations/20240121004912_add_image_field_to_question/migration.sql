/*
  Warnings:

  - Added the required column `description_image` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "description_image" TEXT NOT NULL,
ALTER COLUMN "description" DROP NOT NULL;
