ALTER TABLE "User"
ADD COLUMN "paypalSubscriptionId" TEXT;

CREATE UNIQUE INDEX "User_paypalSubscriptionId_key"
ON "User"("paypalSubscriptionId");
