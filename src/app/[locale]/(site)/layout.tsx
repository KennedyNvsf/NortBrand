import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";

import { AlternatePathsProvider } from "@/components/site/alternate-paths";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { StickyCta } from "@/components/site/sticky-cta";
import { routing } from "@/i18n/routing";

/*
 * Route group for every regular page: nav above, footer below, and the mobile
 * StickyCta. The bar only appears on pages that mark a hero with
 * data-sticky-cta-trigger, so Contact, Legal and blog posts opt out simply by not
 * marking one. The group adds no URL segment. Pages that must not have this chrome
 * (the designed 404, per the Handoff: "Footer: shared by every page except the 404")
 * live outside the group.
 *
 * AlternatePathsProvider lets a page give the nav's language switcher its address in
 * each language (a blog post's slugs differ per language).
 *
 * A first segment that is not a locale (/blog, /xyz) is a 404: notFound() here renders
 * [locale]/not-found.tsx, the same localized 404 as unknown paths under /en and /pt.
 */
export default async function SiteLayout({
  children,
}: LayoutProps<"/[locale]">) {
  if (!hasLocale(routing.locales, await rootLocale())) notFound();

  return (
    <AlternatePathsProvider>
      <SiteNav />
      {children}
      <SiteFooter />
      <StickyCta />
    </AlternatePathsProvider>
  );
}
