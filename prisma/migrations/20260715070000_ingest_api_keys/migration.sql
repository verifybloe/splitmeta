-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uploadApiKeyHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uploadApiKeyPrefix" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_uploadApiKeyHash_key" ON "User"("uploadApiKeyHash");

-- AlterTable
ALTER TABLE "SessionResult" ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SessionResult_userId_externalId_key" ON "SessionResult"("userId", "externalId");
