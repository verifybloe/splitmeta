import { join } from "node:path";
import archiver from "archiver";
import { PassThrough } from "node:stream";

const COMPANION_ROOT = "splitmeta-companion";

export type CompanionConnectConfig = {
  apiKey: string;
  siteUrl: string;
};

function companionPath(...parts: string[]) {
  return join(process.cwd(), "companion", ...parts);
}

export function buildCompanionZip(config: CompanionConnectConfig): PassThrough {
  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("error", (err: Error) => {
    stream.destroy(err);
  });

  archive.pipe(stream);

  const connect = {
    apiKey: config.apiKey,
    siteUrl: config.siteUrl,
    uploaded: [],
  };

  archive.append(JSON.stringify(connect, null, 2), {
    name: `${COMPANION_ROOT}/connect.json`,
  });

  archive.file(companionPath("package.json"), {
    name: `${COMPANION_ROOT}/package.json`,
  });
  archive.file(companionPath("package-lock.json"), {
    name: `${COMPANION_ROOT}/package-lock.json`,
  });
  archive.file(companionPath("README.md"), {
    name: `${COMPANION_ROOT}/README.md`,
  });
  archive.file(companionPath("install.bat"), {
    name: `${COMPANION_ROOT}/install.bat`,
  });
  archive.file(companionPath("START.bat"), {
    name: `${COMPANION_ROOT}/START.bat`,
  });
  archive.directory(companionPath("src"), `${COMPANION_ROOT}/src`);

  void archive.finalize();

  return stream;
}

export function companionZipStream(config: CompanionConnectConfig) {
  const nodeStream = buildCompanionZip(config);
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
