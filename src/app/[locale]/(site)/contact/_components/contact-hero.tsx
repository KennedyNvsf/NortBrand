import { getTranslations } from "next-intl/server";

import { enterItem } from "@/components/motion/reveal-item";
import { highlightTags } from "@/components/site/highlight";
import { LogoMark } from "@/components/site/logo";
import { site } from "@/content/site";
import { ICON_STROKE, icons, type IconName } from "@/lib/icons";

import { ConsultationFormCard } from "./consultation-form-card";

/*
 * Figma Contact › Hero (desktop 278:85, tablet 378:109, mobile 378:328): intro and
 * contact details beside the consultation form card on desktop; stacked below.
 * - Contact details come only from src/content/site.ts (CLAUDE.md) and are still
 *   placeholders there (TODO(client)).
 * - No data-sticky-cta-trigger: Contact has no sticky CTA (it is the booking page).
 * - Entrance (CSS, first paint): headline, lead, details, then the form card.
 * Holds the page's only H1.
 */

type Detail = {
  icon: IconName;
  label: string;
  value: string;
  href?: `mailto:${string}` | `tel:${string}`;
};

export async function ContactHero() {
  const t = await getTranslations("Contact.hero");
  const { email, phone, phoneDisplay, hours } = site.contact;

  const details: Detail[] = [
    {
      icon: "mail",
      label: t("email"),
      value: email.value,
      href: `mailto:${email.value}`,
    },
    {
      icon: "phone",
      label: t("phone"),
      value: phoneDisplay.value,
      href: `tel:${phone.value}`,
    },
    {
      icon: "calendar",
      label: t("availability"),
      value: t("hours", hours.value),
    },
  ];

  return (
    <section
      aria-labelledby="contact-hero-title"
      className="bg-bg-surface pt-16 pb-16 md:pt-18 md:pb-20 lg:pt-17.5 lg:pb-27.5"
    >
      <div className="container-page flex flex-col gap-10 md:gap-2xl lg:flex-row lg:items-start lg:justify-center lg:gap-24">
        <div className="relative flex flex-col gap-lg lg:w-120 lg:shrink-0">
          <LogoMark
            draw="once"
            className="absolute -top-7.5 -left-1 h-8 w-10 md:-top-9 md:-left-3 md:h-10.5 md:w-13 lg:-top-6 lg:-left-13.5 lg:h-12 lg:w-15"
          />
          <h1
            {...enterItem(0)}
            id="contact-hero-title"
            className="text-h1 text-text-primary lg:text-display-section"
          >
            {t.rich("title", highlightTags)}
          </h1>
          <p
            {...enterItem(1)}
            className="text-body text-text-muted lg:text-lead"
          >
            {t("lead")}
          </p>

          <ul
            {...enterItem(2)}
            aria-label={t("detailsLabel")}
            className="flex flex-col gap-lg pt-md"
          >
            {details.map((detail) => (
              <ContactDetail key={detail.icon} {...detail} />
            ))}
          </ul>
        </div>

        <ConsultationFormCard />
      </div>
    </section>
  );
}

function ContactDetail({ icon, label, value, href }: Detail) {
  const Icon = icons[icon];

  const content = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-action-primary-subtle">
        <Icon
          className="size-6 text-action-primary"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-caption text-text-muted">{label}</span>
        <span className="text-lead font-semibold wrap-anywhere text-text-primary transition-colors duration-(--duration-fast) ease-standard group-hover:text-text-accent">
          {value}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a href={href} className="group flex items-center gap-3.5 rounded-sm">
          {content}
        </a>
      ) : (
        <div className="flex items-center gap-3.5">{content}</div>
      )}
    </li>
  );
}
