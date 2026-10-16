import { NextStudio } from "next-sanity/studio";

import config from "../../../../sanity.config";

/*
 * The embedded Sanity Studio (ADR-003). It runs entirely in the browser; editors sign in
 * with their Sanity account. noindex comes from the layout, robots.txt disallows
 * /studio, and the locale proxy only handles the bare "/".
 */
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
