import { parseAllDocuments } from "yaml";

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

function parseSeasonQuarter(seasonId) {
  // iRacing SeasonID encodes year/quarter in places; fallback to calendar quarter.
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  return { seasonYear: new Date().getFullYear(), seasonQuarter: q };
}

export function parseSessionYaml(yamlText, fileName = "") {
  const map = docsToMap(yamlText);
  const weekend = map.get("WeekendInfo") ?? {};
  const driverInfo = map.get("DriverInfo") ?? {};
  const sessionInfo = map.get("SessionInfo") ?? {};
  const carSetup = map.get("CarSetup") ?? map.get("CarSetupSnapshot") ?? {};

  const driverCarIdx = driverInfo.DriverCarIdx ?? 0;
  const driver = pickDriver(driverInfo.Drivers, driverCarIdx);
  const session = pickRaceSession(sessionInfo.Sessions);

  const subSessionId =
    weekend.SubSessionID ??
    weekend.subSessionID ??
    session?.SubSessionID ??
    (fileName.replace(/\D/g, "") || fileName);

  const results = session?.ResultsPositions ?? session?.Results ?? [];
  const myResult = Array.isArray(results)
    ? results.find((r) => r?.CarIdx === driverCarIdx) ??
      results.find((r) => r?.Position === driver?.FinishPosition)
    : null;

  const finishPos =
    myResult?.Position ??
    driver?.FinishPosition ??
    session?.SessionResults?.Position ??
    0;
  const incidents =
    myResult?.Incidents ??
    driver?.Incidents ??
    session?.SessionResults?.Incidents ??
    0;

  const bestLapSec =
    myResult?.FastestTime ??
    myResult?.BestLapTime ??
    driver?.BestLapTime ??
    session?.SessionResults?.FastestTime ??
    0;
  const bestLapMs = Math.round(Number(bestLapSec) * 1000);

  const avgLapSec = myResult?.AverageLapTime ?? bestLapSec;
  const avgLapMs = Math.round(Number(avgLapSec || bestLapSec) * 1000);

  const fieldSize = Array.isArray(driverInfo.Drivers)
    ? driverInfo.Drivers.filter((d) => d?.UserName).length
    : Array.isArray(results)
      ? results.length
      : 0;

  const iratingBefore = driver?.IRating ?? driver?.iRating ?? 0;
  const iratingAfter = driver?.NewIRating ?? iratingBefore;

  const { seasonYear, seasonQuarter } = parseSeasonQuarter(weekend.SeasonID);
  const weekNum = Number(weekend.RaceWeek ?? weekend.Week ?? 1) || 1;

  const trackName =
    weekend.TrackDisplayName ?? weekend.TrackName ?? "Unknown track";
  const trackConfig = weekend.TrackConfigName ?? weekend.TrackCity ?? "";

  const series =
    weekend.SeriesName ??
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
    finishPos: Number(finishPos),
    fieldSize: Number(fieldSize) || 1,
    incidents: Number(incidents),
    bestLapMs: bestLapMs > 0 ? bestLapMs : 1,
    avgLapMs: avgLapMs > 0 ? avgLapMs : bestLapMs || 1,
    racedAt: new Date().toISOString(),
    setupParams,
    iracingCustId: driver?.UserID ? Number(driver.UserID) : undefined,
    displayName: driver?.UserName ? String(driver.UserName) : undefined,
    sessionType: session?.SessionType ? String(session.SessionType) : undefined,
  };
}
