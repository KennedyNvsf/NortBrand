import type { Metadata } from "next";

import { UnsubscribeNewsletter } from "@/features/newsletter/components/unsubscribe-newsletter";
import { newsletterPageMetadata } from "@/features/newsletter/page-metadata";

/* The `unsubscribe_url` in every newsletter (#40, #41). Static, like the confirm page. */

export function generateMetadata(): Promise<Metadata> {
  return newsletterPageMetadata((t) => ({
    title: t("newsletterUnsubscribeTitle"),
    description: t("newsletterUnsubscribeDescription"),
  }));
}

export default function NewsletterUnsubscribePage() {
  return <UnsubscribeNewsletter />;
}
