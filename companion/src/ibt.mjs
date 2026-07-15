import { openSync, readSync, closeSync, fstatSync } from "node:fs";

// irsdk_header is 112 bytes, then irsdk_diskSubHeader, then var headers, session YAML, then samples.
const HEADER_SIZE = 112;
const VAR_HEADER_SIZE = 144;
const DISK_SUBHEADER_SIZE = 32;

// irsdk_SessionState
const STATE_RACING = 4;
const STATE_CHECKERED = 5;
const STATE_COOLDOWN = 6;

function readHeader(fd) {
  const header = Buffer.alloc(HEADER_SIZE);
  readSync(fd, header, 0, HEADER_SIZE, 0);
  return {
    numVars: header.readInt32LE(24),
    varHeaderOffset: header.readInt32LE(28),
    bufLen: header.readInt32LE(36),
    sessionInfoLen: header.readInt32LE(16),
    sessionInfoOffset: header.readInt32LE(20),
  };
}

function readDiskSubHeader(fd) {
  const disk = Buffer.alloc(DISK_SUBHEADER_SIZE);
  readSync(fd, disk, 0, DISK_SUBHEADER_SIZE, HEADER_SIZE);
  return {
    lapCount: disk.readInt32LE(24),
    recordCount: disk.readInt32LE(28),
  };
}

function findVars(fd, varHeaderOffset, numVars, names) {
  const wanted = new Set(names);
  const found = {};
  for (let i = 0; i < numVars; i++) {
    const vh = Buffer.alloc(VAR_HEADER_SIZE);
    readSync(fd, vh, 0, VAR_HEADER_SIZE, varHeaderOffset + i * VAR_HEADER_SIZE);
    const name = vh.toString("utf8", 16, 48).replace(/\0.*$/, "");
    if (wanted.has(name)) {
      found[name] = {
        type: vh.readInt32LE(0),
        offset: vh.readInt32LE(4),
        count: vh.readInt32LE(8),
      };
      if (Object.keys(found).length === wanted.size) break;
    }
  }
  return found;
}

function readNumber(buf, meta) {
  if (!meta) return null;
  // irsdk types: 0 char, 1 bool, 2 int, 3 bitfield, 4 float, 5 double
  if (meta.type === 5) return buf.readDoubleLE(meta.offset);
  if (meta.type === 4) return buf.readFloatLE(meta.offset);
  return buf.readInt32LE(meta.offset);
}

/**
 * Read live telemetry samples from the end of an .ibt file.
 * Race ResultsPositions in YAML are often empty; position lives in samples.
 */
export function readRaceTelemetrySummary(filePath) {
  const fd = openSync(filePath, "r");
  try {
    const header = readHeader(fd);
    const disk = readDiskSubHeader(fd);
    if (disk.recordCount <= 0 || header.bufLen <= 0) {
      return null;
    }

    const vars = findVars(fd, header.varHeaderOffset, header.numVars, [
      "SessionNum",
      "SessionState",
      "PlayerCarPosition",
      "PlayerCarClassPosition",
      "PlayerCarMyIncidentCount",
      "Lap",
      "LapCompleted",
      "LapBestLapTime",
      "LapLastLapTime",
    ]);

    if (!vars.SessionNum || !vars.PlayerCarPosition) {
      return null;
    }

    const dataStart = header.sessionInfoOffset + header.sessionInfoLen;
    const records = disk.recordCount;

    // Walk newest → oldest to find the latest race tick (prefer checkered/cooldown).
    let best = null;
    const scanCount = Math.min(records, 20_000);
    for (let n = 0; n < scanCount; n++) {
      const i = records - 1 - n;
      const buf = Buffer.alloc(header.bufLen);
      readSync(fd, buf, 0, header.bufLen, dataStart + i * header.bufLen);

      const sessionNum = readNumber(buf, vars.SessionNum);
      const sessionState = readNumber(buf, vars.SessionState);
      const position = readNumber(buf, vars.PlayerCarPosition) ?? 0;

      // Skip practice (0) / qualify (1) when possible — race is usually the highest SessionNum used,
      // but we accept any tick with a real position and late session state.
      const isLateState =
        sessionState === STATE_CHECKERED || sessionState === STATE_COOLDOWN;
      const isRacing = sessionState === STATE_RACING;

      if (position <= 0) continue;

      const sample = {
        sessionNum,
        sessionState,
        finishPos: position,
        classPosition: readNumber(buf, vars.PlayerCarClassPosition) ?? 0,
        incidents: readNumber(buf, vars.PlayerCarMyIncidentCount) ?? 0,
        lap: readNumber(buf, vars.Lap) ?? 0,
        lapCompleted: readNumber(buf, vars.LapCompleted) ?? 0,
        bestLapSec: readNumber(buf, vars.LapBestLapTime) ?? 0,
        lastLapSec: readNumber(buf, vars.LapLastLapTime) ?? 0,
        raceComplete: isLateState,
        stillRacing: isRacing,
      };

      if (isLateState) {
        return sample;
      }
      if (!best) best = sample;
    }

    return best;
  } finally {
    closeSync(fd);
  }
}

// --- session YAML helpers (existing) ---

export function readSessionInfoYaml(filePath) {
  const fd = openSync(filePath, "r");
  try {
    const header = Buffer.alloc(48);
    readSync(fd, header, 0, header.length, 0);

    const sessionInfoLen = header.readInt32LE(16);
    const sessionInfoOffset = header.readInt32LE(20);

    if (
      sessionInfoLen <= 0 ||
      sessionInfoOffset <= 0 ||
      sessionInfoLen > 32 * 1024 * 1024
    ) {
      throw new Error("File does not contain a session info block");
    }

    const buf = Buffer.alloc(sessionInfoLen);
    readSync(fd, buf, 0, sessionInfoLen, sessionInfoOffset);

    const nul = buf.indexOf(0);
    return buf.toString("latin1", 0, nul === -1 ? buf.length : nul);
  } finally {
    closeSync(fd);
  }
}
