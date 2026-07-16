import { parseAllDocuments } from "yaml";
import { readRaceTelemetrySummary } from "./ibt.mjs";

function docsToMap(yamlText) {
  const docs = parseAllDocuments(yamlText);
  const map = new Map();
  for (const doc of docs) {
    const root = doc.toJSON();
    if (!root || typeof root !== "object") continue;
    for (const [key, value] of Object.entries(root)) {
      map.set(key, value);
    }
  }
  return map;
}

function pickDriver(drivers, driverCarIdx) {
  if (!Array.isArray(drivers)) return null;
  const byIdx = drivers.find((d) => d?.CarIdx === driverCarIdx);
  if (byIdx) return byIdx;
  return drivers.find((d) => d?.UserName) ?? drivers[0] ?? null;
}

function pickRaceSession(sessions) {
  if (!Array.isArray(sessions)) return null;
  const race = sessions.find((s) =>
    String(s?.SessionType ?? "")
      .toLowerCase()
      .includes("race"),
  );
  return race ?? sessions[sessions.length - 1] ?? null;
}

function flattenSetup(obj, prefix = "", out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj === "number" && Number.isFinite(obj)) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  if (typeof obj === "string") {
    const n = Number(obj);
    if (prefix && obj !== "" && !Number.isNaN(n)) out[prefix] = n;
    return out;
  }
  if (Array.isArray(obj)) return out;
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flattenSetup(value, next, out);
    }
  }
  return out;
}

function parseSeasonQuarter() {
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  return { seasonYear: new Date().getFullYear(), seasonQuarter: q };
}

function resultsArray(session) {
  const results = session?.ResultsPositions ?? session?.Results;
  return Array.isArray(results) ? results : [];
}

function pickQualifySession(sessions) {
  if (!Array.isArray(sessions)) return null;
  return (
    sessions.find((s) =>
      String(s?.SessionType ?? "")
        .toLowerCase()
        .includes("qual"),
    ) ?? null
  );
}

function resolveStartPos(sessions, driverCarIdx, myResult, driver, qualifyInfo) {
  const direct = Number(
    myResult?.StartingPosition ??
      myResult?.StartPosition ??
      myResult?.GridPosition ??
      driver?.StartingPosition ??
      driver?.QualifyingPosition ??
      0,
  );
  if (direct > 0) return direct;

  const qualify = pickQualifySession(sessions);
  const qResults = resultsArray(qualify);
  const qMine =
    qResults.find((r) => r?.CarIdx === driverCarIdx) ??
    null;
  const fromQualify = Number(qMine?.Position ?? qMine?.ClassPosition ?? 0);
  if (fromQualify > 0) return fromQualify;

  const qr = Array.isArray(qualifyInfo?.Results) ? qualifyInfo.Results : [];
  const qrMine = qr.find((r) => r?.CarIdx === driverCarIdx) ?? null;
  const fromQualifyInfo = Number(qrMine?.Position ?? qrMine?.ClassPosition ?? 0);
  if (fromQualifyInfo > 0) return fromQualifyInfo;

  return null;
}

export function parseSessionYaml(yamlText, fileName = "", filePath = "") {
  const map = docsToMap(yamlText);
  const weekend = map.get("WeekendInfo") ?? {};
  const driverInfo = map.get("DriverInfo") ?? {};
  const sessionInfo = map.get("SessionInfo") ?? {};
  const carSetup = map.get("CarSetup") ?? map.get("CarSetupSnapshot") ?? {};

  const driverCarIdx = driverInfo.DriverCarIdx ?? 0;
  const driver = pickDriver(driverInfo.Drivers, driverCarIdx);
  const sessions = sessionInfo.Sessions;
  const session = pickRaceSession(sessions);
  const qualifyInfo = map.get("QualifyResultsInfo") ?? null;

  const subSessionId =
    weekend.SubSessionID ??
    weekend.subSessionID ??
    session?.SubSessionID ??
    (fileName.replace(/\D/g, "") || fileName);

  const results = resultsArray(session);
  const myResult =
    results.find((r) => r?.CarIdx === driverCarIdx) ??
    results.find((r) => r?.Position === driver?.FinishPosition) ??
    null;

  let finishPos = Number(
    myResult?.Position ??
      myResult?.ClassPosition ??
      driver?.FinishPosition ??
      session?.SessionResults?.Position ??
      0,
  );
  let incidents = Number(
    myResult?.Incidents ??
      driver?.Incidents ??
      session?.SessionResults?.Incidents ??
      0,
  );

  let bestLapSec = Number(
    myResult?.FastestTime ??
      myResult?.BestLapTime ??
      driver?.BestLapTime ??
      session?.SessionResults?.FastestTime ??
      0,
  );

  // Race YAML often has empty ResultsPositions — read finish from binary samples.
  let telemetry = null;
  let waitingForResults = false;
  if (filePath) {
    try {
      telemetry = readRaceTelemetrySummary(filePath);
    } catch {
      telemetry = null;
    }
  }

  if (telemetry) {
    if (telemetry.stillRacing && finishPos <= 0) {
      waitingForResults = true;
    }
    if (finishPos <= 0 && telemetry.finishPos > 0) {
      finishPos = telemetry.finishPos;
    }
    if (!incidents && telemetry.incidents) {
      incidents = telemetry.incidents;
    }
    if (!(bestLapSec > 0) && telemetry.bestLapSec > 0) {
      bestLapSec = telemetry.bestLapSec;
    }
    if (!telemetry.raceComplete && telemetry.stillRacing) {
      waitingForResults = true;
    }
  } else if (
    String(session?.SessionType ?? "")
      .toLowerCase()
      .includes("race") &&
    results.length === 0 &&
    finishPos <= 0
  ) {
    waitingForResults = true;
  }

  const bestLapMs = Math.round(Number(bestLapSec) * 1000);
  const avgLapSec = myResult?.AverageLapTime ?? bestLapSec;
  const avgLapMs = Math.round(Number(avgLapSec || bestLapSec) * 1000);
  let startPos = resolveStartPos(
    sessions,
    driverCarIdx,
    myResult,
    driver,
    qualifyInfo,
  );
  if (
    (startPos == null || startPos <= 0) &&
    telemetry?.startPos != null &&
    telemetry.startPos > 0
  ) {
    startPos = telemetry.startPos;
  }

  const fieldSize = Array.isArray(driverInfo.Drivers)
    ? driverInfo.Drivers.filter((d) => d?.UserName && !d?.IsSpectator).length
    : results.length || 1;

  const iratingBefore = driver?.IRating ?? driver?.iRating ?? 0;
  const iratingAfter = driver?.NewIRating ?? iratingBefore;

  const { seasonYear, seasonQuarter } = parseSeasonQuarter(weekend.SeasonID);
  const weekNum = Number(weekend.RaceWeek ?? weekend.Week ?? 1) || 1;

  const trackName =
    weekend.TrackDisplayName ?? weekend.TrackName ?? "Unknown track";
  const trackConfig = weekend.TrackConfigName ?? "";

  const series =
    weekend.SeriesName ??
    (weekend.SeriesID ? `Series ${weekend.SeriesID}` : null) ??
    weekend.Category ??
    weekend.EventType ??
    "iRacing series";

  const car =
    driver?.CarScreenName ??
    driver?.CarPath ??
    driverInfo.DriverCarScreenName ??
    "Unknown car";

  const setupParams = flattenSetup(carSetup);
  if (Object.keys(setupParams).length === 0 && carSetup && typeof carSetup === "object") {
    setupParams._setupHash = JSON.stringify(carSetup).length;
  }

  return {
    externalId: String(subSessionId),
    series: String(series),
    seriesCategory: String(weekend.Category ?? "Sports Car"),
    car: String(car),
    carCategory: String(weekend.Category ?? "Sports Car"),
    track: String(trackName),
    trackConfig: trackConfig ? String(trackConfig) : "",
    seasonYear,
    seasonQuarter,
    weekNum,
    sof: Number(weekend.StrengthOfField ?? weekend.SOF ?? 0),
    iratingBefore: Number(iratingBefore),
    iratingAfter: Number(iratingAfter),
    startPos: startPos != null && startPos > 0 ? Number(startPos) : null,
    finishPos: Number(finishPos) || 0,
    fieldSize: Number(fieldSize) || 1,
    incidents: Number(incidents) || 0,
    bestLapMs: bestLapMs > 0 ? bestLapMs : 1,
    avgLapMs: avgLapMs > 0 ? avgLapMs : bestLapMs || 1,
    racedAt: new Date().toISOString(),
    setupParams,
    iracingCustId: driver?.UserID ? Number(driver.UserID) : undefined,
    displayName: driver?.UserName ? String(driver.UserName) : undefined,
    sessionType: session?.SessionType ? String(session.SessionType) : undefined,
    waitingForResults,
    raceComplete: Boolean(telemetry?.raceComplete),
  };
}
