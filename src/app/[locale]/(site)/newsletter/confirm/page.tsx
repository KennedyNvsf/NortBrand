import type { Metadata } from "next";

import { ConfirmSubscription } from "@/features/newsletter/components/confirm-subscription";
import { NewsletterCard } from "@/features/newsletter/components/newsletter-card";
import { newsletterPageMetadata } from "@/features/newsletter/page-metadata";

/*
 * The confirmation email's link (#40, #41). Static: the link's query string is read in
 * the browser (ConfirmSubscription). The Newsletter card is rendered here, on the
 * server, and shown only for expired or invalid links.
 */

export function generateMetadata(): Promise<Metadata> {
  return newsletterPageMetadata((t) => ({
    title: t("newsletterConfirmTitle"),
    description: t("newsletterConfirmDescription"),
  }));
}

export default function NewsletterConfirmPage() {
  return <ConfirmSubscription newsletterCard={<NewsletterCard />} />;
}
