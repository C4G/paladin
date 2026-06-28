/*
  Warnings:

  - You are about to drop the column `address` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `equipment` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `livestock` on the `Farm` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Farm" DROP COLUMN "address",
DROP COLUMN "equipment",
DROP COLUMN "livestock",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "otherInfo" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "streetAddress" TEXT,
ADD COLUMN     "totalAcreage" TEXT,
ADD COLUMN     "yearEstablished" TEXT,
ADD COLUMN     "zipcode" TEXT,
ALTER COLUMN "other" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "Crop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acreage" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livestock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "count" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "Livestock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Crop" ADD CONSTRAINT "Crop_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livestock" ADD CONSTRAINT "Livestock_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
