import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/site/logo";
import { legalLinks, navItems } from "@/content/navigation";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { CookieSettingsButton } from "@/features/consent/components/cookie-settings-button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Footer (337:128): Desktop 337:127, Tablet 344:114,
 * Mobile 344:145. One server component with responsive classes (Handoff).
 * - Links sit on a 44 pt pitch on touch (Handoff › Footer) and tighten to 15 px with a
 *   16 px gap on desktop.
 * - Company lists About, Blog, Contact: the nav items minus Services, which has its own
 *   column of service links.
 * - Shared by every page except the 404: it lives in the (site) route-group layout, and
 *   the 404 renders outside that group.
 */

const linkClassName = cn(
  "touch-target inline-flex min-h-11 items-center rounded-sm text-body text-text-primary lg:min-h-0 lg:text-nav lg:font-normal",
  "transition-colors duration-(--duration-fast) ease-standard hover:text-text-accent",
);

const legalLinkClassName =
  "inline-flex min-h-11 cursor-pointer items-center rounded-sm transition-colors duration-(--duration-fast) ease-standard hover:text-text-accent lg:min-h-0";

// Cached so the build-time year does not make the page dynamic (Cache Components).
// Next.js requires "use cache" functions to be async even when nothing is awaited.
// eslint-disable-next-line @typescript-eslint/require-await
async function getCopyrightYear() {
  "use cache";
  return new Date().getFullYear();
}

function FooterColumn({
  id,
  title,
  className,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0", className)}>
      <h2 id={id} className="text-overline font-semibold text-text-primary">
        {title}
      </h2>
      <ul className="mt-2 flex flex-col lg:mt-md lg:gap-md">{children}</ul>
    </section>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const serviceNames = await getTranslations("ServiceNames");
  const year = await getCopyrightYear();
  // Services has its own column; Track Project is nav-only (lead's decision, 2026-11-13).
  const companyLinks = navItems.filter(
    ({ key }) => key !== "services" && key !== "trackProject",
  );

  return (
    <footer className="bg-bg-surface">
      <div className="mx-auto max-w-(--container-canvas) px-(--gutter) pt-14 md:pt-20 lg:pt-(--section-y)">
        <div className="flex flex-col gap-9 pb-10 md:gap-11 md:pb-2xl lg:flex-row lg:gap-20">
          <div className="flex flex-col items-start gap-lg lg:w-80 lg:shrink-0">
            <Link
              href="/"
              className="touch-target rounded-sm text-text-primary"
            >
              <Logo label={nav("home")} />
            </Link>
            <p className="text-small text-text-muted">{t("tagline")}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-lg gap-y-9 md:flex md:gap-14 lg:gap-20">
            <FooterColumn
              id="footer-services"
              title={t("services")}
              className="col-span-2"
            >
              {services.map(({ slug, key }) => (
                <li key={slug}>
                  <Link
                    href={{ pathname: "/services", hash: slug }}
                    className={linkClassName}
                  >
                    {serviceNames(key)}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn id="footer-company" title={t("company")}>
              {companyLinks.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href} className={linkClassName}>
                    {nav(key)}
                  </Link>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn id="footer-follow" title={t("follow")}>
              {site.social.map(({ network, label, href }) => (
                <li key={network}>
                  <a href={href} className={linkClassName}>
                    {label}
                  </a>
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        {/* The StickyCta steps aside here, so it never covers the legal links (#42). */}
        <div
          data-sticky-cta-hide=""
          className="flex flex-col gap-1 border-t border-border-default pt-4 pb-5 text-caption text-text-muted md:flex-row md:items-center md:justify-between md:pt-4 md:pb-5 lg:py-lg"
        >
          <p className="py-2 lg:py-0">{t("rights", { year })}</p>
          <nav aria-label={t("legal")}>
            <ul className="flex flex-wrap gap-x-7 md:gap-x-lg">
              {legalLinks.map(({ key, href }) => (
                <li key={key}>
                  <Link href={href} className={legalLinkClassName}>
                    {t(key)}
                  </Link>
                </li>
              ))}
              {/* Reopens the cookie preferences (ADR-007; not in the Figma footer). */}
              <li>
                <CookieSettingsButton className={legalLinkClassName}>
                  {t("cookies")}
                </CookieSettingsButton>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
