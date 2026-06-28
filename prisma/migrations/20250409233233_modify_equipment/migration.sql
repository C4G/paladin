/*
  Warnings:

  - You are about to drop the column `model` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Equipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "model",
DROP COLUMN "year",
ADD COLUMN     "description" TEXT;