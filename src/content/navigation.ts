/**
 * Primary navigation (Figma 02 Components › Nav, 337:98). Paths are locale-independent;
 * the locale-aware Link from @/i18n/navigation adds /en or /pt. Labels live in
 * messages under `Nav.<key>`.
 *
 * Blog stays in the nav before its page exists; until then the link shows the designed
 * 404 (CLAUDE.md, Navigation).
 */
export const navItems = [
  { key: "services", href: "/services" },
  { key: "about", href: "/about" },
  { key: "blog", href: "/blog" },
  // The client portal's entry point (Figma Nav 514:399, ADR-009). Desktop nav and the
  // tablet/mobile menu; not the footer (lead's decision, 2026-11-13).
  { key: "trackProject", href: "/portal" },
  { key: "contact", href: "/contact" },
] as const satisfies readonly { key: string; href: `/${string}` }[];

export type NavKey = (typeof navItems)[number]["key"];

/** Pages whose hero photo sits under a transparent nav (Handoff › Nav). */
export const overlayNavRoutes = ["/services"] as const;

export const BOOKING_HREF = "/contact";

/** Footer bottom bar (Figma 337:122). Pages ship with the legal ticket (#13). */
export const legalLinks = [
  { key: "privacy", href: "/legal/privacy" },
  { key: "terms", href: "/legal/terms" },
] as const satisfies readonly { key: string; href: `/${string}` }[];

/**
 * A nav item is active on its own page and on any page below it, so /blog stays active
 * on /blog/some-post. `pathname` is the locale-free path from usePathname().
 */
export function isActiveRoute(pathname: string, href: `/${string}`): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isOverlayRoute(pathname: string): boolean {
  return overlayNavRoutes.some((route) => pathname === route);
}
