import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");

const jobs = [
  { in: "still-jamaica-lane.png", width: 1400, quality: 68 },
  { in: "still-jamaica-zinc.png", width: 1000, quality: 70 },
  { in: "still-crossing.png", width: 1400, quality: 68 },
  { in: "still-toronto-gable.png", width: 1400, quality: 68 },
  { in: "still-toronto-night.png", width: 1400, quality: 68 },
  { in: "still-studio-console.png", width: 1400, quality: 68 },
  { in: "tape-silk-808.png", width: 900, quality: 72 },
  { in: "tape-booth-vol3.png", width: 900, quality: 72 },
  { in: "tape-after-hours.png", width: 900, quality: 72 },
  { in: "tape-crate-dig.png", width: 900, quality: 72 },
];

for (const job of jobs) {
  const src = path.join(root, job.in);
  const dest = src.replace(/\.png$/i, ".webp");
  await sharp(src)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality, effort: 4 })
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  console.log(job.in, "→", path.basename(dest), meta.size || "", meta.width + "x" + meta.height);
}
