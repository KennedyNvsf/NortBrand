import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localeAlternates } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * PLACEHOLDER (Phase 1). Proves /[locale] routing, hreflang and the design tokens, and
 * shows Button and Input in every state for comparison with Figma 02 Components.
 * Replace with the real Home page in Phase 2.
 */

async function currentLocale(): Promise<Locale> {
  const locale = await rootLocale();
  return routing.locales.find((l) => l === locale) ?? routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localeAlternates(await currentLocale(), "/") };
}

export default async function PlaceholderPage() {
  const locale = await currentLocale();
  const otherLocale: Locale = locale === "en" ? "pt" : "en";
  const t = await getTranslations("Placeholder");
  const common = await getTranslations("Common");

  return (
    <main id="main" className="container-page py-(--section-y)">
      <p className="text-overline text-text-accent">{t("eyebrow")}</p>
      <h1 className="mt-md text-display text-text-primary">{t("title")}</h1>
      <p className="mt-lg max-w-(--container-reading) text-lead text-text-muted">
        {t("lead")}
      </p>

      <p className="mt-lg">
        <Link
          href="/"
          locale={otherLocale}
          lang={otherLocale}
          className="inline-flex min-h-11 items-center text-label text-text-accent underline underline-offset-4"
        >
          {t("switchLocale")}
        </Link>
      </p>

      <section
        aria-label="Button states"
        className="mt-2xl grid gap-lg border-t border-border-default pt-xl"
      >
        {(["primary", "secondary", "ghost"] as const).map((variant) => (
          <div key={variant} className="flex flex-wrap items-center gap-lg">
            <Button variant={variant} showIcon>
              {common("bookConsultation")}
            </Button>
            <Button variant={variant} showIcon disabled>
              {common("bookConsultation")}
            </Button>
            <Button variant={variant} loading>
              {common("sending")}
            </Button>
          </div>
        ))}
      </section>

      <section
        aria-label="Input states"
        className="mt-2xl grid gap-xl border-t border-border-default pt-xl md:grid-cols-2 lg:grid-cols-3"
      >
        <div className="grid content-start gap-sm">
          <Label htmlFor="email-default">{t("emailLabel")}</Label>
          <Input
            id="email-default"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
          />
        </div>
        <div className="grid content-start gap-sm">
          <Label htmlFor="email-error">{t("emailLabel")}</Label>
          <Input
            id="email-error"
            type="email"
            aria-invalid
            aria-describedby="email-error-message"
            placeholder={t("emailPlaceholder")}
          />
          <p
            id="email-error-message"
            className="flex items-start gap-1.5 text-[13px] leading-[1.4] text-text-error"
          >
            <CircleAlert
              className="mt-px size-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
            {t("emailError")}
          </p>
        </div>
        <div className="grid content-start gap-sm">
          <Label htmlFor="email-disabled" className="text-text-disabled">
            {t("emailLabel")}
          </Label>
          <Input
            id="email-disabled"
            type="email"
            disabled
            placeholder={t("emailPlaceholder")}
          />
        </div>
      </section>
    </main>
  );
}
