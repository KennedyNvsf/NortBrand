import { getFormatter, getTranslations } from "next-intl/server";

import { TableOfContents } from "@/components/site/table-of-contents";
import { legalDocuments, type LegalDocumentKey } from "@/content/legal";
import { site } from "@/content/site";

import { emailTag, type LegalCopy } from "./legal-copy";

/*
 * One layout for both legal pages (Figma 09 — Legal: Privacy 323:3, Terms 323:121;
 * tablet 379:2407 / 379:2733, mobile 379:2572 / 379:2891).
 * - Header: eyebrow · H1 · lead · last updated.
 * - Article: numbered H2 sections (each with an anchor id) in a 680 reading column.
 *   Desktop adds a sticky "On this page" list and the questions note on the right;
 *   below desktop the list is dropped and the note follows the article (Figma).
 * - Copy arrives resolved (legal-copy.tsx); the contact email comes from site.ts.
 * - No sticky CTA on legal pages (CLAUDE.md): the header is not a trigger.
 * Server component; TableOfContents is the only client code.
 */

export async function LegalDocument({
  document: documentKey,
  copy,
}: {
  document: LegalDocumentKey;
  copy: LegalCopy;
}) {
  const t = await getTranslations("Legal");
  const format = await getFormatter();
  const legalDocument = legalDocuments[documentKey];

  const lastUpdated = format.dateTime(new Date(legalDocument.updated), {
    dateStyle: "long",
    timeZone: site.timeZone,
  });

  const tocItems = copy.sections.map(({ id, title }) => ({ id, label: title }));

  const questions = (
    <div className="flex flex-col gap-md border-t border-border-default pt-5.5">
      <p className="text-nav font-semibold text-text-primary">
        {t("questionsTitle")}
      </p>
      <p className="text-small text-text-muted">
        {t.rich("questionsBody", emailTag)}
      </p>
    </div>
  );

  return (
    <main id="main" data-status={legalDocument.status}>
      <header className="bg-bg-surface pt-14 pb-xl md:pt-18 md:pb-10 lg:pt-20 lg:pb-16">
        <div className="container-page flex flex-col gap-md md:gap-lg">
          <p className="text-overline text-text-accent">{t("eyebrow")}</p>
          <h1 className="text-display-xl text-text-primary">{copy.title}</h1>
          <p className="text-intro text-text-muted lg:max-w-175">{copy.lead}</p>
          <p className="text-label text-text-muted">
            {t("lastUpdated", { date: lastUpdated })}
          </p>
        </div>
      </header>

      <div className="bg-bg-surface pb-18 md:pb-22 lg:pb-32.5">
        <div className="container-page">
          <div className="flex items-start justify-between gap-2xl border-t border-border-default pt-xl md:pt-10 lg:pt-2xl">
            <div className="flex max-w-170 min-w-0 flex-1 flex-col gap-lg">
              <article className="flex flex-col gap-lg">
                {copy.sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-title`}
                    className="flex flex-col gap-md pb-4.5"
                  >
                    <span
                      aria-hidden
                      className="text-overline text-text-accent"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2
                      id={`${section.id}-title`}
                      className="text-h3 font-bold tracking-[-0.006em] text-text-primary"
                    >
                      {section.title}
                    </h2>
                    <p className="text-body text-text-muted lg:text-lead">
                      {section.body}
                    </p>
                    {section.items && (
                      <ul className="flex list-disc flex-col gap-3 pl-5 text-body text-text-primary marker:text-action-primary lg:text-lead">
                        {section.items.map((item) => (
                          <li key={item} className="pl-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </article>
              <div className="lg:hidden">{questions}</div>
            </div>

            <aside className="sticky top-28 hidden w-60 shrink-0 flex-col gap-md lg:flex">
              <TableOfContents items={tocItems} label={t("onThisPage")} />
              {questions}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
