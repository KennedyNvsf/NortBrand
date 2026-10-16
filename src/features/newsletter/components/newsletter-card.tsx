import { useId } from "react";
import { useTranslations } from "next-intl";

import { highlightTags } from "@/components/site/highlight";
import { MarkPanel } from "@/components/site/mark-panel";
import { cn } from "@/lib/utils";

import { NewsletterForm } from "./newsletter-form";

/*
 * Figma 02 Components › Newsletter (desktop 337:161, tablet 346:130, mobile 346:148)
 * and Newsletter States (408:182). One component; the breakpoint variants are design
 * states, built with responsive classes (Handoff).
 * - A server shell (headline, intro, mark) around the only client part, the form.
 * - Dark card: [data-surface=dark] switches the focus ring to white and error text to
 *   red/300 (globals.css).
 * - The mark panel shows on desktop only, as in the tablet and mobile frames.
 * - Placement: the Blog listing and every post (M4), and the link-expired page (#41).
 */
export function NewsletterCard({ className }: { className?: string }) {
  const t = useTranslations("Newsletter.card");
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      data-surface="dark"
      data-newsletter-card=""
      className={cn(
        "flex items-center gap-10 overflow-hidden rounded-lg bg-text-primary px-7 py-9 text-left md:px-12 md:py-13 lg:justify-between lg:p-18",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-lg lg:max-w-140">
        {/* Figma: Bold 28 / 32 / 42, line height 1.1, tracking -1%. */}
        <h2
          id={titleId}
          className="text-[28px] leading-[1.1] font-bold tracking-[-0.01em] text-text-on-accent md:text-[32px] lg:text-[42px]"
        >
          {t.rich("title", highlightTags)}
        </h2>
        <p className="text-body leading-[1.52] text-text-on-dark-muted md:text-lead md:leading-[1.52] lg:text-[17px]">
          {t("body")}
        </p>
        <NewsletterForm />
      </div>
      <MarkPanel
        className="hidden h-65 w-80 shrink-0 lg:flex"
        markClassName="size-58.5"
      />
    </section>
  );
}
