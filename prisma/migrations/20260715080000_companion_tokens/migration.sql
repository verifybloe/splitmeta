-- AlterTable
ALTER TABLE "User" ADD COLUMN "companionTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "companionTokenPrefix" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_companionTokenHash_key" ON "User"("companionTokenHash");
