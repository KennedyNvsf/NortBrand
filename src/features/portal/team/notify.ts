import "server-only";

import { publicEnv } from "@/env";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { sendEmail } from "@/lib/resend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { renderPortalUpdate } from "../emails/render";
import { getTeamViewer } from "./access";
import { getClientRecipients } from "./plan/data";

/*
 * Emails a project's clients a team update (#138 health/launch/milestones, #139 "Needs
 * you"), each in their language, linking their portal. Called after the change is
 * saved, under the teammate's session (RLS: the team reads its project's clients).
 * Throws on the first failed send so the caller can say the email didn't go out; never
 * logs addresses.
 */
export async function notifyClients(
  projectId: string,
  body: string,
  options: { needsClient?: boolean } = {},
): Promise<number> {
  if (isFakeBackendEnabled()) return 1;
  const supabase = await getPortalSupabase();
  const { data: project, error } = await supabase
    .from("projects")
    .select("name, public_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !project) throw new Error("project");

  const [recipients, viewer] = await Promise.all([
    getClientRecipients(projectId),
    getTeamViewer(),
  ]);
  const author = viewer.status === "signed_in" ? viewer.name : "NortBrand";

  let sent = 0;
  for (const recipient of recipients) {
    const email = await renderPortalUpdate({
      locale: recipient.locale,
      projectName: project.name,
      publicId: project.public_id,
      authorName: author,
      body,
      siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      needsClient: options.needsClient,
    });
    const result = await sendEmail({ to: recipient.email, ...email });
    if (!result.ok) throw new Error(result.code);
    sent += 1;
  }
  return sent;
}
