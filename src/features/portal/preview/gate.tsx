import * as Sentry from "@sentry/nextjs";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { MotionProvider } from "@/components/motion/motion-provider";

import type { PortalLocale } from "../overview/format";
import { ClientShell } from "../shell/client-shell";
import { getClientShellCopy } from "../shell/shell-copy";
import { getTeamShell } from "../team/shell-data";
import { previewCopy } from "../team/copy";
import { getPreviewBundle, type PreviewBundle } from "./data";
import { PreviewBanner } from "./preview-banner";

/*
 * View as client (#160): the guard and frame for every preview page. A signed-in
 * teammate who works on the project gets the client portal frame (ClientShell, in the
 * client's language) under the preview banner; anyone else is sent to sign-in, and a
 * project they can't preview is a 404 (portal_client_preview decides, in SQL).
 */

export const PREVIEW_LOCALES: readonly PortalLocale[] = ["en", "pt"];

export function isPreviewLocale(value: string): value is PortalLocale {
  return (PREVIEW_LOCALES as readonly string[]).includes(value);
}

export function previewBase(publicId: string, locale: PortalLocale): string {
  return `/team/projects/${publicId.toUpperCase()}/preview/${locale}`;
}

/** The bundle for a signed-in teammate, after the session check. */
export async function loadPreview(
  publicId: string,
): Promise<PreviewBundle | null | "failed"> {
  if (!(await getTeamShell())) redirect("/team/sign-in");
  try {
    return await getPreviewBundle(publicId);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "portal-preview" } });
    return "failed";
  }
}

export async function PreviewGate({
  publicId,
  lang,
  children,
}: {
  publicId: string;
  lang: string;
  children: ReactNode;
}) {
  if (!isPreviewLocale(lang)) notFound();
  const bundle = await loadPreview(publicId);
  if (bundle === null) notFound();
  if (bundle === "failed") {
    return (
      <main id="main" className="px-(--gutter) py-8">
        <p role="alert" className="text-body text-text-muted">
          {previewCopy.loadFailed}
        </p>
      </main>
    );
  }

  const base = previewBase(bundle.view.publicId, lang);
  return (
    <MotionProvider>
      <div lang={lang}>
        <ClientShell
          data={bundle.shell}
          locale={lang}
          copy={await getClientShellCopy(lang)}
          preview={{
            base,
            banner: (
              <PreviewBanner
                copy={previewCopy}
                publicId={bundle.view.publicId}
                locale={lang}
              />
            ),
          }}
        >
          {children}
        </ClientShell>
      </div>
    </MotionProvider>
  );
}
