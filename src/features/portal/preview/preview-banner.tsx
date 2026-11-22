import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ICON_STROKE } from "@/lib/icons";

import type { PortalLocale } from "../overview/format";
import type { PreviewCopy } from "../team/copy";
import { LanguageSwitch } from "./language-switch";

/*
 * The strip above the client portal frame in View as client (#160). Not drawn in Figma:
 * built from the system (the dark brand surface, 44 px targets). It says what this is,
 * switches the client's language (EN/PT) and leads back to the team's project page.
 * Team UI, so English whatever language the preview shows.
 */
export function PreviewBanner({
  copy,
  publicId,
  locale,
}: {
  copy: PreviewCopy;
  publicId: string;
  locale: PortalLocale;
}) {
  return (
    <section
      lang="en"
      aria-label={copy.bannerLabel}
      data-surface="dark"
      className="flex flex-wrap items-center gap-x-md bg-text-primary px-(--gutter) text-[13px] text-text-on-accent md:pr-8 md:pl-6"
    >
      <p className="flex min-h-11 items-center gap-2 font-medium">
        <Eye
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="size-4 shrink-0"
        />
        {copy.banner}
      </p>
      <span className="flex-1" />
      {/* useSearchParams needs a boundary; the switch appears once the URL is known. */}
      <Suspense fallback={null}>
        <LanguageSwitch
          current={locale}
          label={copy.language}
          short={copy.languages}
          names={copy.languageNames}
        />
      </Suspense>
      <Link
        href={`/team/projects/${publicId}`}
        className="flex min-h-11 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
      >
        <ArrowLeft aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        {copy.exit}
      </Link>
    </section>
  );
}
