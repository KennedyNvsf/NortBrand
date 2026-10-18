import { getTranslations } from "next-intl/server";

import { enterItem } from "@/components/motion/reveal-item";
import { LogoMark } from "@/components/site/logo";

/*
 * Figma 05 Blog › Header (204:20; tablet 370:262, mobile 370:630): the page's H1, a
 * lead, and the red squiggle accent (207:28). Figma's green eyebrow is left out by
 * the lead's decision (#74); posts keep theirs (Blog.eyebrow).
 * - The squiggle is a flourish after the headline's last word, at cap height. Figma
 *   hangs it off the first line; a fixed position cannot follow the line breaks of
 *   both languages at every width, so it follows the text instead. The last word and
 *   the mark never wrap apart (nowrap), so the mark can neither sit alone on a line
 *   nor be pushed into the gutter, and it stays within its own line, clear of the
 *   one above. Sized in em: 45 × 37 at the 44 px desktop headline, as in Figma.
 * - Entrance (CSS, as on Home): headline, then lead, 110 ms apart; the squiggle
 *   draws itself once the headline has landed (the same timing as a hero underline).
 *   Reduced motion: no drawing, the mark is simply there.
 * data-sticky-cta-trigger: the mobile StickyCta appears once this hero has scrolled
 * away (CLAUDE.md: every page except Contact, Legal, the 404 and blog posts).
 */
export async function BlogHero() {
  const t = await getTranslations("Blog");
  const title = t("title");
  const split = title.lastIndexOf(" ") + 1;
  const head = title.slice(0, split);
  const lastWord = title.slice(split);

  return (
    <section
      data-sticky-cta-trigger
      className="overflow-x-clip bg-bg-surface px-(--gutter) pt-14 pb-10 md:pt-18 md:pb-14 lg:pt-22.5 lg:pb-17.5"
    >
      <div className="mx-auto flex max-w-190 flex-col items-center gap-md text-center lg:gap-lg">
        <h1
          {...enterItem(0)}
          className="text-h1 font-bold text-balance text-text-primary lg:text-[44px] lg:leading-[1.14] lg:tracking-[-0.005em] lg:text-wrap"
        >
          {head}
          <span className="whitespace-nowrap">
            {lastWord}
            <span
              aria-hidden
              className="relative inline-block h-[0.84em] w-[1.16em] align-top"
            >
              <LogoMark
                draw="once"
                className="absolute top-[0.06em] right-0 h-[0.84em] w-[1.02em] [--mark-delay:calc(500ms+var(--enter-index,0)*var(--enter-step))]"
              />
            </span>
          </span>
        </h1>
        <p
          {...enterItem(1)}
          className="max-w-145 text-body text-text-muted md:text-lead lg:text-[17px] lg:leading-[1.55]"
        >
          {t("lead")}
        </p>
      </div>
    </section>
  );
}
