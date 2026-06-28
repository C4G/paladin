/*
  Warnings:

  - You are about to drop the column `address` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `equipment` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `gate` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `livestock` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `other` on the `Request` table. All the data in the column will be lost.
  - Added the required column `farmId` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_createdBy_fkey";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "address",
DROP COLUMN "createdBy",
DROP COLUMN "email",
DROP COLUMN "equipment",
DROP COLUMN "gate",
DROP COLUMN "latitude",
DROP COLUMN "livestock",
DROP COLUMN "longitude",
DROP COLUMN "other",
ADD COLUMN     "comments" TEXT,
ADD COLUMN     "farmId" TEXT NOT NULL,
ADD COLUMN     "preferredGateId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "livestock" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "other" TEXT NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "RequestId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate" ADD CONSTRAINT "Gate_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_preferredGateId_fkey" FOREIGN KEY ("preferredGateId") REFERENCES "Gate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
