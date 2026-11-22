import type { PortalLocale } from "./format";

/*
 * Who a client portal screen renders for (#160). Normally the client, under their own
 * session and RLS, at /<locale>/portal/<NB-xxxx>. In "View as client" the team renders
 * the same screens from portal_client_preview (the client's view, computed in SQL), at
 * /team/projects/<NB-xxxx>/preview/<locale>. Links inside the screens follow `base`.
 */

export type PreviewTarget = {
  /** e.g. /team/projects/NB-1234/preview/pt */
  base: string;
  /** The Project ID being previewed (the preview's data is keyed by it). */
  publicId: string;
};

/** The root of the portal screens' links: the client's route, or the preview's. */
export function portalBase(
  locale: PortalLocale,
  publicId: string,
  preview?: PreviewTarget,
): string {
  return preview?.base ?? `/${locale}/portal/${publicId}`;
}
