"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

import { signOutClient } from "../actions";

/*
 * Sign out (#131). The server action clears the session; the browser then loads the
 * sign-in page in full. A client-side navigation could restore the signed-in page from
 * Next's router cache, which must never happen after signing out.
 */
export function SignOutButton({
  label,
  locale,
}: {
  label: string;
  locale: Locale;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      loading={pending}
      onClick={() => {
        startTransition(async () => {
          window.location.assign(await signOutClient(locale));
        });
      }}
    >
      {label}
    </Button>
  );
}
