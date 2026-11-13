import { getTranslations } from "next-intl/server";

import { highlightTags } from "@/components/site/highlight";

import { PromoLauncher } from "./promo-launcher";

/*
 * Server shell for the Home promo (#126): translates the copy on the server and hands
 * it to the client launcher, which renders nothing until the offer is due. Placed at
 * the end of Home's <main>; the dialog itself portals to <body>.
 */
export async function HomePromo() {
  const [t, tCommon] = await Promise.all([
    getTranslations("Promo"),
    getTranslations("Common"),
  ]);

  return (
    <PromoLauncher
      placement="home"
      copy={{
        label: t("label"),
        until: t("until"),
        offer: t("offer"),
        offerLabel: t("offerLabel"),
        title: t.rich("title", { ...highlightTags, br: () => <br /> }),
        body: t("body"),
        terms: t("terms"),
        book: tCommon("bookConsultation"),
        dismiss: t("dismiss"),
        close: t("close"),
      }}
    />
  );
}
