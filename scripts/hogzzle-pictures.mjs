// Prepares Hogzzle's pictures of assets/hogzzle/ for the console, from the originals only:
// - src/games/hogzzle/pictures.gen.ts: each picture's name, grids, and which tiles look the same
// - src/games/hogzzle/images.gen.ts: each picture encoded as a data URI for Svg
// Run with `pnpm hogzzle:pictures`. Pictures are only resized and re-encoded, never cropped or recolored.

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SQUARE = [
  [3, 3],
  [4, 4],
  [5, 5],
  [6, 6],
];
const WIDE = [
  [4, 2],
  [6, 3],
  [8, 4],
];

const PICTURES = [
  { id: "professor", name: "Professor Max", file: "avatar-professor-max.png", grids: SQUARE },
  { id: "builder", name: "Builder Max", file: "avatar-builder-max.png", grids: SQUARE },
  { id: "phone", name: "Max on the phone", file: "banner-posthog-array-blog.png", grids: WIDE },
  {
    id: "diary",
    name: "Max writing at night",
    file: "banner-posthog-ceo-diary-blog.png",
    grids: WIDE,
  },
  { id: "scenes", name: "Max in four scenes", file: "banner-posthog-features.jpg", grids: WIDE },
];

// Svg's source is capped at 131 072 characters; the rest of the board needs the difference
const URI_BUDGET = 115_000;
// About twice the drawn width: sharp on a high-density screen, no bigger
const MAX_WIDTH = 640;
const WIDTH_STEP = 16;
const JPEG_QUALITY = 80;
// Two tiles look the same when no block of SAMPLES × SAMPLES differs by more than this per channel
const SAMPLES = 8;
const TOLERANCE = 8;

// Pictures sit on white: transparency is flattened onto it, as the board draws it
const encoders = {
  png: (img) => img.png({ compressionLevel: 9 }),
  jpeg: (img) =>
    img.flatten({ background: "#ffffff" }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }),
};

const dataUri = (format, buf) => `data:image/${format};base64,${buf.toString("base64")}`;

// The widest encoding under the budget, PNG first on a tie since it is lossless
async function encode(original) {
  const { width } = await sharp(original).metadata();
  let best = null;
  for (const format of ["png", "jpeg"]) {
    for (let w = Math.min(width, MAX_WIDTH); w > 0; w -= WIDTH_STEP) {
      const buf = await encoders[format](sharp(original).resize({ width: w })).toBuffer();
      const uri = dataUri(format, buf);
      if (uri.length > URI_BUDGET) continue;
      if (!best || w > best.width) best = { format, width: w, buf, uri };
      break;
    }
  }
  if (!best) throw new Error("no encoding fits the budget");
  const { height } = await sharp(best.buf).metadata();
  return { ...best, height };
}

// Average color of each of SAMPLES × SAMPLES blocks of the tile, RGB
function signature({ data, width, height }, columns, rows, k) {
  const x0 = (k % columns) * (width / columns);
  const y0 = Math.floor(k / columns) * (height / rows);
  const tw = width / columns;
  const th = height / rows;
  const out = [];
  for (let by = 0; by < SAMPLES; by++) {
    for (let bx = 0; bx < SAMPLES; bx++) {
      const xa = Math.round(x0 + (bx * tw) / SAMPLES);
      const xb = Math.max(xa + 1, Math.round(x0 + ((bx + 1) * tw) / SAMPLES));
      const ya = Math.round(y0 + (by * th) / SAMPLES);
      const yb = Math.max(ya + 1, Math.round(y0 + ((by + 1) * th) / SAMPLES));
      const sum = [0, 0, 0];
      for (let y = ya; y < yb; y++) {
        for (let x = xa; x < xb; x++) {
          for (let c = 0; c < 3; c++) sum[c] += data[(y * width + x) * 3 + c];
        }
      }
      const n = (xb - xa) * (yb - ya);
      out.push(sum[0] / n, sum[1] / n, sum[2] / n);
    }
  }
  return out;
}

const looksSame = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= TOLERANCE);

// `looks[k]`: the first piece that looks like piece k (k itself when none before it does)
function looksOf(pixels, columns, rows) {
  const sigs = Array.from({ length: columns * rows }, (_, k) =>
    signature(pixels, columns, rows, k),
  );
  const looks = [];
  sigs.forEach((sig, k) => {
    looks.push(looks.find((j, i) => j === i && looksSame(sigs[i], sig)) ?? k);
  });
  return looks;
}

// The pixels as shown: the encoded picture decoded back, on white
async function pixelsOf(buf) {
  const { data, info } = await sharp(buf)
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const games = [];
const images = [];
for (const picture of PICTURES) {
  const original = readFileSync(new URL(`../assets/hogzzle/${picture.file}`, import.meta.url));
  const encoded = await encode(original);
  const pixels = await pixelsOf(encoded.buf);
  const grids = picture.grids.map(([columns, rows]) => ({
    columns,
    rows,
    looks: looksOf(pixels, columns, rows),
  }));
  games.push({ id: picture.id, name: picture.name, grids });
  images.push({ id: picture.id, href: encoded.uri, width: encoded.width, height: encoded.height });
  const shared = grids
    .map((g) => `${g.columns}x${g.rows}: ${g.looks.filter((j, i) => j !== i).length}`)
    .join(", ");
  console.log(
    `${picture.id}: ${encoded.format} ${encoded.width}x${encoded.height}, ${encoded.uri.length} chars; tiles like an earlier one: ${shared}`,
  );
}

const HEADER =
  "// Generated by scripts/hogzzle-pictures.mjs from assets/hogzzle/: do not edit, run `pnpm hogzzle:pictures`\n";
const ids = PICTURES.map((p) => JSON.stringify(p.id)).join(" | ");

writeFileSync(
  new URL("../src/games/hogzzle/pictures.gen.ts", import.meta.url),
  `${HEADER}
export type PictureId = ${ids};

// Pieces and slots are read row by row; \`looks[k]\` is the first piece that looks like piece k
export type Grid = { columns: number; rows: number; looks: readonly number[] };

export type Picture = { id: PictureId; name: string; grids: readonly Grid[] };

export const PICTURES: readonly Picture[] = ${JSON.stringify(games)};
`,
);

writeFileSync(
  new URL("../src/games/hogzzle/images.gen.ts", import.meta.url),
  `${HEADER}
import type { PictureId } from "./pictures.gen";

// \`href\` is a data URI; \`width\` and \`height\` in the picture's pixels
export const PICTURE_IMAGES: Record<PictureId, { href: string; width: number; height: number }> = ${JSON.stringify(
    Object.fromEntries(images.map(({ id, ...image }) => [id, image])),
  )};
`,
);
