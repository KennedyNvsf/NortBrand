import type { Metadata } from "next";
import type { ReactNode } from "react";

/*
 * The Studio's own root layout: it sits outside [locale], so it gets none of the site's
 * fonts, styles, providers or consent banner. Editors are not visitors.
 */
export const metadata: Metadata = {
  title: "NortBrand Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
