import { ImageResponse } from "next/og";

import {
  LOGO_MARK_PATH,
  LOGO_VIEW_BOX,
  LOGO_WORDMARK_PATH,
} from "@/components/site/logo";
import { SHARE_IMAGE_SIZE } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";

/*
 * Share image for every page (Open Graph and Twitter), served at /<locale>/opengraph-image.
 * pageMetadata (src/i18n/metadata.ts) references it from every page; Next.js also adds
 * it to pages without their own Open Graph fields, such as the 404.
 * Figma has no share-card design. The card follows the site's dark logomark panels
 * (MarkPanel): the text/primary surface with the white wordmark and the red mark.
 * Flat colour keeps the PNG small (a photo made it ~1.5 MB, too heavy for some apps'
 * link previews), and the logo comes from its own vector paths, so no fonts are needed.
 * The OG renderer cannot read CSS variables, so the brand colours are literal:
 * text/primary #150D0D, action/primary #E82828, text/on-accent #FFFFFF (globals.css).
 */

/* Prerender one PNG per locale at build time (otherwise rendered per request). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const alt = "NortBrand";
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

const INK = "#150d0d";
const RED = "#e82828";
const WHITE = "#ffffff";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: INK,
      }}
    >
      <svg width={760} height={150} viewBox={LOGO_VIEW_BOX} fill="none">
        <path
          d={LOGO_MARK_PATH}
          stroke={RED}
          strokeWidth={4.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={LOGO_WORDMARK_PATH} fill={WHITE} />
      </svg>
    </div>,
    size,
  );
}
