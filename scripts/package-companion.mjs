import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const companionDir = join(root, "companion");
const outDir = join(companionDir, "dist");
const outFile = join(outDir, "splitmeta-companion.zip");

mkdirSync(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Packaged companion (${archive.pointer()} bytes) → ${outFile}`);
});

archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);

archive.file(join(companionDir, "package.json"), { name: "splitmeta-companion/package.json" });
archive.file(join(companionDir, "package-lock.json"), {
  name: "splitmeta-companion/package-lock.json",
});
archive.file(join(companionDir, "README.md"), { name: "splitmeta-companion/README.md" });
archive.file(join(companionDir, "install.bat"), { name: "splitmeta-companion/install.bat" });
archive.file(join(companionDir, "START.bat"), { name: "splitmeta-companion/START.bat" });
archive.directory(join(companionDir, "src"), "splitmeta-companion/src");

await archive.finalize();

if (!existsSync(outFile)) {
  throw new Error("Companion zip was not created");
}
