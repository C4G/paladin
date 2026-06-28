-- CreateTable
CREATE TABLE "EmergencyNeed" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,

    CONSTRAINT "EmergencyNeed_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmergencyNeed" ADD CONSTRAINT "EmergencyNeed_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
