-- AlterTable
ALTER TABLE "OrgRequest" ADD COLUMN     "reviewerId" TEXT;

-- AddForeignKey
ALTER TABLE "OrgRequest" ADD CONSTRAINT "OrgRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
