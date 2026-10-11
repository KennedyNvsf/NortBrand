import { getTranslations } from "next-intl/server";

import { RevealGroup } from "@/components/motion/reveal-group";
import { revealItem } from "@/components/motion/reveal-item";
import { highlightTags } from "@/components/site/highlight";
import { LINK_ROOT, TextLinkContent } from "@/components/site/text-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqKeys } from "@/content/faq";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/*
 * Figma Contact › FAQ (desktop 280:48, tablet 378:176, mobile 378:395).
 * - Handoff: "FAQ: shadcn Accordion, type=single, collapsible", first question open.
 * - Desktop: intro column (400) beside the questions, 96 apart. Stacked below.
 * - "Send us a message" is a mailto link while the form is not live; the form ticket
 *   can point it at the form instead.
 * Server component: the Accordion primitive is the only client code.
 */
export async function ContactFaq() {
  const t = await getTranslations("Contact.faq");
  const email = site.contact.email.value;

  return (
    <section
      aria-labelledby="contact-faq-title"
      className="bg-bg-surface pb-18 md:pb-22 lg:pt-5 lg:pb-15"
    >
      <RevealGroup className="container-page flex flex-col gap-7 md:gap-9 lg:flex-row lg:items-start lg:gap-24">
        <div className="flex flex-col items-start gap-lg lg:w-100 lg:shrink-0">
          <p {...revealItem()} className="text-overline text-action-secondary">
            {t("eyebrow")}
          </p>
          <h2
            {...revealItem()}
            id="contact-faq-title"
            className="text-h2 font-bold tracking-[-0.01em] text-text-primary"
          >
            {t.rich("title", highlightTags)}
          </h2>
          <p {...revealItem()} className="text-body text-text-muted">
            {t("body")}
          </p>
          <a
            {...revealItem()}
            href={`mailto:${email}`}
            className={cn(
              LINK_ROOT,
              "inline-flex min-h-11 items-center rounded-sm lg:min-h-0",
            )}
          >
            <TextLinkContent>{t("link")}</TextLinkContent>
          </a>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue={faqKeys[0]}
          className="min-w-0 flex-1 border-t border-border-default"
        >
          {faqKeys.map((key) => (
            <AccordionItem
              {...revealItem()}
              key={key}
              value={key}
              className="border-t-0 border-b first:border-t-0"
            >
              <AccordionTrigger className="text-lead font-semibold text-text-primary">
                {t(`items.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="pb-lg text-body text-text-muted">
                {t(`items.${key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </RevealGroup>
    </section>
  );
}
