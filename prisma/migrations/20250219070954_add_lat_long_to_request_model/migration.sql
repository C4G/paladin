/*
  Warnings:

  - Added the required column `createdBy` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
