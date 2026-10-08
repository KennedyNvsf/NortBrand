import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import {
  ArticleCard,
  ArticleCardSkeleton,
} from "@/components/site/article-card";
import { CtaBand } from "@/components/site/cta-band";
import { Logo } from "@/components/site/logo";
import { ServiceCard } from "@/components/site/service-card";
import { StickyCta } from "@/components/site/sticky-cta";
import { TextLink } from "@/components/site/text-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/content/services";
import { localeAlternates } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/*
 * PLACEHOLDER (Phase 1). Proves /[locale] routing, hreflang and the design tokens, and
 * shows the primitives in their states for comparison with Figma 02 Components.
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
  const p = await getTranslations("Placeholder.preview");
  const serviceNames = await getTranslations("ServiceNames");

  return (
    <main id="main">
      <div className="container-page py-(--section-y)">
        <div
          data-sticky-cta-trigger
          className="mb-2xl flex flex-wrap items-center gap-lg"
        >
          <Logo className="text-text-primary" />
          <div
            data-surface="dark"
            className="rounded-md bg-text-primary px-lg py-md text-text-on-accent"
          >
            <Logo decorative />
          </div>
        </div>
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
            <FieldError id="email-error-message">{t("emailError")}</FieldError>
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
        <section
          aria-label="Badges and links"
          className="mt-2xl flex flex-wrap items-center gap-lg border-t border-border-default pt-xl"
        >
          <Badge>{p("badgeNew")}</Badge>
          <Badge variant="accent">{p("badgeNew")}</Badge>
          <Badge variant="selected">{p("badgeNew")}</Badge>
          <TextLink href="/services">{p("learnMore")}</TextLink>
        </section>

        <section
          aria-label="Cards"
          className="mt-2xl grid gap-xl border-t border-border-default pt-xl md:grid-cols-2 lg:grid-cols-3"
        >
          <ServiceCard
            href="/services"
            icon="calendar"
            title={p("serviceTitle")}
            description={p("serviceDescription")}
            actionLabel={p("learnMore")}
          />
          <ServiceCard
            icon="layout"
            title={p("serviceTitle")}
            description={p("serviceDescription")}
            actionLabel={p("learnMore")}
          />
          <div className="hidden lg:block" />
          <ArticleCard
            href="/blog"
            headingLevel="h2"
            title={p("articleTitle")}
            excerpt={p("articleExcerpt")}
            category={p("articleCategory")}
            byline={p("articleByline")}
            actionLabel={p("readMore")}
          />
          <ArticleCardSkeleton />
        </section>

        <section
          aria-label="Select and textarea states"
          className="mt-2xl grid gap-xl border-t border-border-default pt-xl md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="grid content-start gap-sm">
            <Label htmlFor="service-default">{p("selectLabel")}</Label>
            <Select>
              <SelectTrigger id="service-default">
                <SelectValue placeholder={p("selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {services.map(({ slug, key }) => (
                  <SelectItem key={slug} value={slug}>
                    {serviceNames(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid content-start gap-sm">
            <Label htmlFor="service-error">{p("selectLabel")}</Label>
            <Select>
              <SelectTrigger
                id="service-error"
                aria-invalid
                aria-describedby="service-error-message"
              >
                <SelectValue placeholder={p("selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {services.map(({ slug, key }) => (
                  <SelectItem key={slug} value={slug}>
                    {serviceNames(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="service-error-message">
              {p("selectError")}
            </FieldError>
          </div>
          <div className="grid content-start gap-sm">
            <Label htmlFor="service-disabled" className="text-text-disabled">
              {p("selectLabel")}
            </Label>
            <Select disabled>
              <SelectTrigger id="service-disabled">
                <SelectValue placeholder={p("selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
          <div className="grid content-start gap-sm">
            <Label htmlFor="message-default">{p("messageLabel")}</Label>
            <Textarea
              id="message-default"
              placeholder={p("messagePlaceholder")}
            />
          </div>
          <div className="grid content-start gap-sm">
            <Label htmlFor="message-error">{p("messageLabel")}</Label>
            <Textarea
              id="message-error"
              aria-invalid
              aria-describedby="message-error-message"
              placeholder={p("messagePlaceholder")}
            />
            <FieldError id="message-error-message">
              {p("messageError")}
            </FieldError>
          </div>
          <div className="grid content-start gap-sm">
            <Label htmlFor="message-disabled" className="text-text-disabled">
              {p("messageLabel")}
            </Label>
            <Textarea
              id="message-disabled"
              disabled
              placeholder={p("messagePlaceholder")}
            />
          </div>
        </section>
      </div>
      <CtaBand />
      <StickyCta />
    </main>
  );
}
