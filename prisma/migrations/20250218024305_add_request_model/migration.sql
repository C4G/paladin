-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "disasterType" TEXT NOT NULL,
    "livestock" TEXT,
    "equipment" TEXT,
    "other" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedOn" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "gate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
