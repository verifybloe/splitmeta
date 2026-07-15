import { openSync, readSync, closeSync } from "node:fs";

// iRacing .ibt files start with the irsdk_header struct (little-endian int32s):
// ver(0) status(4) tickRate(8) sessionInfoUpdate(12) sessionInfoLen(16)
// sessionInfoOffset(20) numVars(24) varHeaderOffset(28) numBuf(32) bufLen(36)
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

    // YAML block is latin1 text, often NUL-padded at the end.
    const nul = buf.indexOf(0);
    return buf.toString("latin1", 0, nul === -1 ? buf.length : nul);
  } finally {
    closeSync(fd);
  }
}
