import { createTranslator } from "next-intl";

import { site } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { emailMessages, toEmail, type RenderedEmail } from "@/lib/email/render";

import { fill } from "../auth/components/copy";
import { firstSignInEmailCopy } from "../team/copy";
import { PortalDigestEmail } from "./portal-digest";
import { PortalFirstSignInEmail } from "./portal-first-sign-in";
import { PortalUpdateEmail } from "./portal-update";
import { PortalWelcomeEmail } from "./portal-welcome";

export type PortalWelcome = {
  email: string;
  locale: Locale;
  projectId: string;
  projectName: string;
  clientName: string;
  leadName: string;
  /** The site's origin, e.g. https://nortbrand.pt (passed in so this stays env-free). */
  siteUrl: string;
  /** The Project ID was rotated (#141): same email, saying the ID changed. */
  newId?: boolean;
};

/** The welcome email, in the client's language, linking that language's sign-in page. */
export function renderPortalWelcome(
  welcome: PortalWelcome,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: welcome.locale,
    messages: emailMessages[welcome.locale],
    namespace: "Emails.portalWelcome",
  });
  const signInUrl = `${welcome.siteUrl.replace(/\/$/, "")}/${welcome.locale}/portal`;

  const changed = welcome.newId === true;

  return toEmail(
    t(changed ? "newIdSubject" : "subject", { project: welcome.projectName }),
    <PortalWelcomeEmail
      locale={welcome.locale}
      studio={site.name}
      projectId={welcome.projectId}
      signInUrl={signInUrl}
      copy={{
        preview: t(changed ? "newIdPreview" : "preview", {
          projectId: welcome.projectId,
        }),
        heading: t(changed ? "newIdHeading" : "heading", {
          project: welcome.projectName,
        }),
        intro: changed
          ? t("newIdIntro", { client: welcome.clientName, studio: site.name })
          : t("intro", {
              lead: welcome.leadName,
              client: welcome.clientName,
              studio: site.name,
            }),
        idLabel: t("idLabel"),
        howTo: t("howTo", { email: welcome.email }),
        button: t("button"),
        fallback: t("fallback"),
        footer: t("footer", { studio: site.name, email: welcome.email }),
      }}
    />,
  );
}

export type PortalUpdateNotice = {
  locale: Locale;
  projectName: string;
  publicId: string;
  authorName: string;
  body: string;
  /** The site's origin, e.g. https://nortbrand.pt. */
  siteUrl: string;
  /** A "Needs you" post: its own subject and heading, sent straight away (#139). */
  needsClient?: boolean;
};

/** A team update, in the client's language, linking that project's portal. */
export function renderPortalUpdate(
  notice: PortalUpdateNotice,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: notice.locale,
    messages: emailMessages[notice.locale],
    namespace: "Emails.portalUpdate",
  });
  const portalUrl = `${notice.siteUrl.replace(/\/$/, "")}/${notice.locale}/portal/${notice.publicId}`;
  const values = {
    project: notice.projectName,
    author: notice.authorName,
    studio: site.name,
  };

  return toEmail(
    t(notice.needsClient ? "subjectNeedsYou" : "subject", values),
    <PortalUpdateEmail
      locale={notice.locale}
      studio={site.name}
      body={notice.body}
      portalUrl={portalUrl}
      copy={{
        preview: t("preview", values),
        heading: notice.needsClient
          ? t("headingNeedsYou")
          : t("heading", values),
        byline: t("byline", values),
        button: t("button"),
        fallback: t("fallback"),
        footer: t("footer", values),
      }}
    />,
  );
}

export type PortalDigest = {
  locale: Locale;
  projectName: string;
  publicId: string;
  updates: {
    author: string | null;
    body: string;
    createdAt: string;
    highlight: boolean;
    needsClient: boolean;
  }[];
  siteUrl: string;
};

const lisbonTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

/** The daily digest for one client and project, in their language, times in Lisbon. */
export function renderPortalDigest(
  digest: PortalDigest,
): Promise<RenderedEmail> {
  const t = createTranslator({
    locale: digest.locale,
    messages: emailMessages[digest.locale],
    namespace: "Emails.portalDigest",
  });
  const portalUrl = `${digest.siteUrl.replace(/\/$/, "")}/${digest.locale}/portal/${digest.publicId}`;
  const values = { project: digest.projectName };

  return toEmail(
    t("subject", values),
    <PortalDigestEmail
      locale={digest.locale}
      studio={site.name}
      portalUrl={portalUrl}
      entries={digest.updates.map((update) => ({
        meta: t("meta", {
          author: update.author ?? t("team"),
          time: lisbonTime(update.createdAt),
        }),
        body: update.body,
        needsYou: update.needsClient,
        milestone: update.highlight,
      }))}
      copy={{
        preview: t("preview", { count: digest.updates.length }),
        heading: t("heading", values),
        needsYou: t("needsYou"),
        milestone: t("milestone"),
        button: t("button"),
        fallback: t("fallback"),
        footer: t("footer", values),
      }}
    />,
  );
}

export type PortalFirstSignIn = {
  leadName: string;
  clientEmail: string;
  projectName: string;
  publicId: string;
  /** The site's origin, e.g. https://nortbrand.pt. */
  siteUrl: string;
};

/** To the project lead: a client signed in for the first time (#159). English only. */
export function renderPortalFirstSignIn(
  notice: PortalFirstSignIn,
): Promise<RenderedEmail> {
  const copy = firstSignInEmailCopy;
  const accessUrl = `${notice.siteUrl.replace(/\/$/, "")}/team/projects/${notice.publicId}/access`;
  const values = {
    lead: notice.leadName,
    client: notice.clientEmail,
    project: notice.projectName,
    studio: site.name,
  };

  return toEmail(
    fill(copy.subject, values),
    <PortalFirstSignInEmail
      studio={site.name}
      accessUrl={accessUrl}
      copy={{
        preview: fill(copy.preview, values),
        heading: fill(copy.heading, values),
        body: fill(copy.body, values),
        button: copy.button,
        fallback: copy.fallback,
        footer: fill(copy.footer, values),
      }}
    />,
  );
}
