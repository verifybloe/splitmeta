-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "band" "RatingBand" NOT NULL,
    "lastTopFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "band" "RatingBand" NOT NULL,
    "seriesWeekId" TEXT NOT NULL,
    "weekNum" INT NOT NULL,
    "previousTop" TEXT,
    "newTop" TEXT NOT NULL,
    "previousLabel" TEXT,
    "newLabel" TEXT,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistItem_seriesId_band_idx" ON "WatchlistItem"("seriesId", "band");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_seriesId_band_key" ON "WatchlistItem"("userId", "seriesId", "band");

-- CreateIndex
CREATE INDEX "MetaAlert_userId_readAt_createdAt_idx" ON "MetaAlert"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "MetaAlert_seriesId_band_idx" ON "MetaAlert"("seriesId", "band");

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAlert" ADD CONSTRAINT "MetaAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaAlert" ADD CONSTRAINT "MetaAlert_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
