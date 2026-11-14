"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SignInFlow } from "../../auth/components/sign-in-flow";
import { requestTeamCode, verifyTeamCode } from "../actions";
import { teamBrandCopy, teamSignInCopy } from "../copy";

/*
 * Team sign-in (Figma TM-14, #132): the shared flow with the email alone. The team
 * portal sits outside the locale routes (English only), so it uses Next's own router
 * and links; a signed-in teammate opens the workspace.
 */
export function TeamSignIn() {
  const router = useRouter();
  return (
    <SignInFlow
      copy={teamSignInCopy}
      requestCode={(details) => requestTeamCode({ email: details.email })}
      verifyCode={(details) =>
        verifyTeamCode({ email: details.email, code: details.code })
      }
      onSignedIn={() => {
        router.push("/team");
      }}
      help={
        <>
          <span>{teamBrandCopy.clientPrompt}</span>
          <Link
            href="/en/portal"
            className="touch-target font-medium text-action-primary-hover underline-offset-2 hover:underline"
          >
            {teamBrandCopy.clientLink}
          </Link>
        </>
      }
    />
  );
}
