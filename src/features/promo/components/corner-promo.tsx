import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";
import type { PromoPlacement } from "@/content/promo";

import { PromoCardLauncher } from "./promo-card-launcher";

/*
 * Server shell for the promo corner card (#127), placed per page on About and Services
 * (never in the layout). Translates the copy on the server and hands it to the client
 * launcher, which renders nothing until the offer is due, so the pages stay static.
 * The card's line is the offer's terms (lead's decision, 2026-11-22: reuse translated
 * copy rather than add a string), and its headline is the modal's, on one line break.
 */
export async function CornerPromo({
  placement,
}: {
  placement: Exclude<PromoPlacement, "home">;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations("Promo"),
    getTranslations("Common"),
  ]);

  return (
    <PromoCardLauncher
      placement={placement}
      copy={{
        label: t("label"),
        title: t.rich("title", { ...highlightTags, br: () => <br /> }),
        terms: t("terms"),
        book: tCommon("bookConsultation"),
        close: t("close"),
      }}
    />
  );
}
