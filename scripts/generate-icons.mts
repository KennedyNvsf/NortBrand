/**
 * pnpm icons:generate
 *
 * Rasterises the squiggle mark (src/app/icon.svg, from LOGONORT 54:16) into the raster
 * icons the App Router and search engines expect (#81). Figma has no separate favicon or
 * touch-icon artwork, so every file is the same mark:
 *
 * - src/app/favicon.ico            16, 32 and 48 px, transparent (PNG-compressed ICO)
 * - src/app/apple-icon.png         180 px on white: iOS fills transparency with black
 * - public/images/logo-square.png  512 px on white: the Organization JSON-LD logo
 *
 * Chromium (already installed for Playwright) does the rendering, so no image library
 * is needed. Re-run it whenever icon.svg changes, and commit the output.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));

const mark = readFileSync(path("src/app/icon.svg"), "utf8");
/** --color-bg-surface: iOS and Google show the icon on an opaque square. */
const SURFACE = "#ffffff";

type Render = { size: number; inset: number; background?: string };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** The mark centred in a size × size square, `inset` of the side left free on each edge. */
async function render({ size, inset, background }: Render): Promise<Buffer> {
  const padding = Math.round(size * inset);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html>
    <style>
      html, body { margin: 0; background: ${background ?? "transparent"}; }
      div { box-sizing: border-box; width: ${size}px; height: ${size}px; padding: ${padding}px; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
    <div>${mark}</div>`);
  return page.screenshot({ omitBackground: !background, type: "png" });
}

/** An ICO file holding PNG images (supported by every current browser). */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

try {
  const favicon = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      png: await render({ size, inset: 0.04 }),
    })),
  );
  writeFileSync(path("src/app/favicon.ico"), ico(favicon));

  // Apple rounds the corners; a 20% inset keeps the mark clear of them.
  writeFileSync(
    path("src/app/apple-icon.png"),
    await render({ size: 180, inset: 0.2, background: SURFACE }),
  );
  writeFileSync(
    path("public/images/logo-square.png"),
    await render({ size: 512, inset: 0.16, background: SURFACE }),
  );

  console.log(
    "Icons written: src/app/favicon.ico, src/app/apple-icon.png, public/images/logo-square.png",
  );
} finally {
  await browser.close();
}
