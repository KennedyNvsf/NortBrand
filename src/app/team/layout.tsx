import type { Metadata } from "next";
import type { ReactNode } from "react";

import { instrumentSans } from "../fonts";
import "../globals.css";

/*
 * The team portal's own root layout (#132, ADR-009): English only and outside the locale
 * routes, like /studio. It gets the site's fonts and tokens but none of the marketing
 * chrome: no nav or footer, no consent banner and no analytics. Every team page is
 * noindex, out of the sitemap and disallowed in robots.txt.
 */

export const metadata: Metadata = {
  title: { default: "NortBrand Team", template: "%s · NortBrand Team" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body className="bg-bg-surface">
        <a
          href="#main"
          className="sr-only rounded-md bg-bg-surface px-md py-sm text-label text-text-primary shadow-overlay focus-visible:not-sr-only focus-visible:fixed focus-visible:top-md focus-visible:left-md focus-visible:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
