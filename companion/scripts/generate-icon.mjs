import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const png = join(root, "assets", "icon.png");
const ico = join(root, "assets", "icon.ico");
const uiIcon = join(root, "ui", "icon.png");

if (!existsSync(png)) {
  throw new Error(`Missing ${png}`);
}

const buf = await pngToIco(png);
writeFileSync(ico, buf);
copyFileSync(png, uiIcon);
console.log(`Generated ${ico} and copied icon to ui/`);
