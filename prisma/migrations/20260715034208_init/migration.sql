-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "iracingCustId" INTEGER,
    "displayName" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "config" TEXT
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SeriesWeek" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "seasonQuarter" INTEGER NOT NULL,
    "weekNum" INTEGER NOT NULL,
    CONSTRAINT "SeriesWeek_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeriesWeek_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "seriesWeekId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setup_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Setup_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Setup_seriesWeekId_fkey" FOREIGN KEY ("seriesWeekId") REFERENCES "SeriesWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "seriesWeekId" TEXT NOT NULL,
    "sof" INTEGER NOT NULL,
    "iratingBefore" INTEGER NOT NULL,
    "iratingAfter" INTEGER NOT NULL,
    "finishPos" INTEGER NOT NULL,
    "fieldSize" INTEGER NOT NULL,
    "incidents" INTEGER NOT NULL,
    "bestLapMs" INTEGER NOT NULL,
    "avgLapMs" INTEGER NOT NULL,
    "racedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SessionResult_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "Setup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SessionResult_seriesWeekId_fkey" FOREIGN KEY ("seriesWeekId") REFERENCES "SeriesWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyMeta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesWeekId" TEXT NOT NULL,
    "band" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" TEXT NOT NULL,
    CONSTRAINT "WeeklyMeta_seriesWeekId_fkey" FOREIGN KEY ("seriesWeekId") REFERENCES "SeriesWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_iracingCustId_key" ON "User"("iracingCustId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_name_key" ON "Car"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Track_name_config_key" ON "Track"("name", "config");

-- CreateIndex
CREATE UNIQUE INDEX "Series_name_key" ON "Series"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SeriesWeek_seriesId_seasonYear_seasonQuarter_weekNum_key" ON "SeriesWeek"("seriesId", "seasonYear", "seasonQuarter", "weekNum");

-- CreateIndex
CREATE INDEX "Setup_seriesWeekId_carId_idx" ON "Setup"("seriesWeekId", "carId");

-- CreateIndex
CREATE UNIQUE INDEX "Setup_fingerprint_seriesWeekId_key" ON "Setup"("fingerprint", "seriesWeekId");

-- CreateIndex
CREATE INDEX "SessionResult_seriesWeekId_sof_idx" ON "SessionResult"("seriesWeekId", "sof");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyMeta_seriesWeekId_band_key" ON "WeeklyMeta"("seriesWeekId", "band");
