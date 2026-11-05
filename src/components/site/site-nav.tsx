import { getTranslations } from "next-intl/server";

import { BookingButton } from "@/components/site/booking-button";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NavLinks } from "@/components/site/nav-links";
import { SiteHeader } from "@/components/site/site-header";
import { Link } from "@/i18n/navigation";

/*
 * Figma: 02 Components › Navigation (337:98). One SiteNav for every breakpoint; the
 * Figma breakpoint variants are design states built with responsive classes (Handoff):
 * - Mobile  < 768:  logo + menu button
 * - Tablet  768+:   logo + Book a Consultation + menu button
 * - Desktop 1024+:  logo · centred links · EN·PT + Book a Consultation
 * The nav spans the full canvas with the page gutter (wider than the content column),
 * as in Figma. This file is a server component; only SiteHeader, NavLinks,
 * LocaleSwitcher and MobileMenu ship JavaScript.
 */
export async function SiteNav() {
  const t = await getTranslations("Nav");
  const common = await getTranslations("Common");

  return (
    <SiteHeader>
      <div className="mx-auto flex max-w-(--container-canvas) items-center justify-between gap-lg px-(--gutter) py-3.5 md:py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:py-lg">
        <Link href="/" className="touch-target justify-self-start rounded-sm">
          <Logo label={t("home")} />
        </Link>

        <nav aria-label={t("label")} className="hidden lg:block">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-3 justify-self-end lg:gap-lg">
          <LocaleSwitcher className="hidden lg:flex" />
          <BookingButton className="hidden md:inline-flex">
            {common("bookConsultation")}
          </BookingButton>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </SiteHeader>
  );
}
