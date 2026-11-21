import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "entry.png");
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
const target = join(outDir, "entry.png");

if (!existsSync(source)) {
  throw new Error(`entry.png not found next to main.ts: ${source}`);
}

const data = readFileSync(source);

if (data.length < 33 || !data.subarray(0, 8).equals(PNG_MAGIC)) {
  throw new Error("entry.png is not a PNG file (bad magic bytes)");
}

if (data.subarray(12, 16).toString("ascii") !== "IHDR") {
  throw new Error("entry.png is not a PNG file (first chunk is not IHDR)");
}

const width = data.readUInt32BE(16);
const height = data.readUInt32BE(20);
if (width === 0 || height === 0) {
  throw new Error("entry.png has zero width or height");
}
if (width > 1024 || height > 1024) {
  throw new Error(`entry.png is ${width}x${height}, larger than 1024x1024`);
}

if (data.subarray(data.length - 8, data.length - 4).toString("ascii") !== "IEND") {
  throw new Error("entry.png is truncated (missing IEND chunk)");
}

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

const copied = readFileSync(target);
if (!copied.equals(data)) {
  throw new Error(`copy verification failed: ${target} differs from ${source}`);
}
console.log(`Wrote ${target} (${width}x${height}, ${data.length} bytes)`);
