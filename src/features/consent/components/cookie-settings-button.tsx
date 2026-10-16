"use client";

import { openConsentPreferences } from "../consent-store";

/*
 * "Cookie settings" in the footer's legal links (ADR-007: the choice can be changed
 * from the footer). A button, not a link: it opens the preferences in place. The
 * footer passes its own link styling so it sits in line with Privacy and Terms.
 */
export function CookieSettingsButton({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      data-cookie-settings=""
      onClick={openConsentPreferences}
      className={className}
    >
      {children}
    </button>
  );
}
