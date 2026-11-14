"use client";

import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

import { requestClientCode, verifyClientCode } from "../actions";
import type { SignInCopy } from "./copy";
import { SignInFlow } from "./sign-in-flow";

/*
 * Client sign-in (Figma CP-01, CP-02, CP-08; #131): the shared flow with the Project ID
 * field, the client server actions and the localized router. A signed-in client opens
 * their project.
 */
export function ClientSignIn({
  copy,
  locale,
}: {
  copy: SignInCopy;
  locale: Locale;
}) {
  const router = useRouter();
  return (
    <SignInFlow
      copy={copy}
      projectIdField={{
        label: copy.projectId,
        placeholder: copy.projectIdPlaceholder,
        hint: copy.projectIdHint,
      }}
      requestCode={(details) => requestClientCode({ ...details, locale })}
      verifyCode={(details) => verifyClientCode({ ...details, locale })}
      onSignedIn={(projectId) => {
        if (projectId) router.push(`/portal/${projectId}`);
      }}
      help={
        <>
          <span>{copy.lostId}</span>
          <Link
            href="/contact"
            className="touch-target font-medium text-action-primary-hover underline-offset-2 hover:underline"
          >
            {copy.contactUs}
          </Link>
        </>
      }
    />
  );
}
