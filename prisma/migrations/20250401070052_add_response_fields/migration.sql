/*
  Warnings:

  - Added the required column `estimatedArrivalTime` to the `Response` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Response" ADD COLUMN     "estimatedArrivalTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Response_RequestId_idx" ON "Response"("RequestId");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_RequestId_fkey" FOREIGN KEY ("RequestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
