"use server";

import { publicEnv } from "@/env";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { sendEmail } from "@/lib/resend";
import { createAuthUser, deleteAuthUser } from "@/lib/supabase/admin";
import { getPortalSupabase } from "@/lib/supabase/auth";

import { reportPortalFailure } from "../../auth/server";
import { renderPortalWelcome } from "../../emails/render";
import { getTeamViewer, listTeammates } from "../access";
import { fakeCreateAuthUser } from "../e2e-backend";
import { fakeSendWelcome } from "../projects/e2e-store";
import {
  accessErrorFor,
  conflictFor,
  lockoutSchema,
  personSchema,
  projectSchema,
  type AccessError,
} from "./access-rules";
import { addPerson, type AddPersonResult } from "./add-person";
import {
  fakeAddPerson,
  fakeClearLockout,
  fakeFindPerson,
  fakeLogInvite,
  fakeRemovePerson,
  fakeRotate,
} from "./e2e-store";

/*
 * Client access actions (#141; Figma TM-06). Admins only: checked here and again in
 * every SQL function. Auth users are created with the service role (auth administration
 * only, ADR-009); every table write runs under the admin's own session. Emails go out
 * after the change is saved, and a failed email never undoes it. Only codes are logged.
 */

const report = reportPortalFailure("portal-team-admin");

export type AccessResult =
  { status: "saved" } | { status: "refused"; error: AccessError };

export type RotateResult =
  | { status: "rotated"; publicId: string; emailed: number; failed: number }
  | { status: "refused"; error: AccessError };

type Admin = { userId: string; name: string };

async function admin(): Promise<Admin | null> {
  const viewer = await getTeamViewer();
  return viewer.status === "signed_in" && viewer.role === "admin"
    ? { userId: viewer.userId, name: viewer.name }
    : null;
}

function refused(
  where: string,
  error: { code?: string; message?: string },
): { status: "refused"; error: AccessError } {
  const named =
    (error.code === "PT409" ? conflictFor(error.message ?? "") : null) ??
    accessErrorFor(error.code);
  if (named) return { status: "refused", error: named };
  report(where, error.code);
  return { status: "refused", error: "failed" };
}

/** Project and lead names for the welcome email, read under the admin's session. */
async function projectForEmail(projectId: string) {
  const { data } = await (
    await getPortalSupabase()
  )
    .from("projects")
    .select("public_id, name, client_name, lead_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!data) return null;
  const lead = (await listTeammates()).find((p) => p.userId === data.lead_id);
  return {
    publicId: data.public_id,
    name: data.name,
    clientName: data.client_name,
    leadName: lead?.name ?? "NortBrand",
  };
}

async function sendWelcome(
  projectId: string,
  person: { email: string; locale: "en" | "pt" },
  newPublicId?: string,
): Promise<boolean> {
  if (isFakeBackendEnabled()) {
    return fakeSendWelcome({
      email: person.email,
      locale: person.locale,
      projectId,
      publicId: newPublicId ?? "NB-1234",
      projectName: "E2E Café website",
      clientName: "E2E Café",
      leadId: "",
    });
  }
  const project = await projectForEmail(projectId);
  if (!project) return false;
  const email = await renderPortalWelcome({
    email: person.email,
    locale: person.locale,
    projectId: newPublicId ?? project.publicId,
    projectName: project.name,
    clientName: project.clientName,
    leadName: project.leadName,
    siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
    newId: newPublicId !== undefined,
  });
  const sent = await sendEmail({ to: person.email, ...email });
  if (!sent.ok) report(newPublicId ? "send_new_id" : "send_welcome", sent.code);
  return sent.ok;
}

async function logInvite(projectId: string, email: string, actor: Admin) {
  if (isFakeBackendEnabled()) {
    fakeLogInvite(email, actor.name);
    return;
  }
  const { error } = await (
    await getPortalSupabase()
  ).rpc("portal_log_invite_sent", { p_project_id: projectId, p_email: email });
  if (error) report("log_invite", error.code);
}

export async function addPersonAction(
  input: unknown,
): Promise<AddPersonResult> {
  const fake = isFakeBackendEnabled();
  return addPerson(input, {
    viewer: getTeamViewer,
    findAccount: async (email) => {
      if (fake) return { userId: null, isTeammate: false };
      const { data, error } = await (
        await getPortalSupabase()
      ).rpc("portal_find_client_users", { p_emails: [email] });
      if (error) return { error: { code: error.code } };
      const row = data.at(0);
      return {
        userId: row?.user_id ?? null,
        isTeammate: row?.is_teammate ?? false,
      };
    },
    createAuthUser: (email) =>
      fake ? fakeCreateAuthUser(email) : createAuthUser(email),
    deleteAuthUser: (userId) =>
      fake ? Promise.resolve() : deleteAuthUser(userId),
    addClient: async (person, userId) => {
      if (fake) {
        const viewer = await admin();
        const answer = fakeAddPerson(person, viewer?.name ?? "NortBrand");
        return answer === "ok"
          ? "ok"
          : { error: { code: "PT409", message: answer } };
      }
      const { error } = await (
        await getPortalSupabase()
      ).rpc("portal_add_client", {
        p_project_id: person.projectId,
        p_email: person.email,
        p_name: person.name ?? "",
        p_locale: person.locale,
        p_user_id: userId,
      });
      return error
        ? { error: { code: error.code, message: error.message } }
        : "ok";
    },
    sendWelcome: (person) => sendWelcome(person.projectId, person),
    // The fake store logs the invite when it adds the person.
    logInviteSent: async (person) => {
      if (fake) return;
      const actor = await admin();
      if (actor) await logInvite(person.projectId, person.email, actor);
    },
    reportFailure: report,
  });
}

export async function resendInviteAction(
  input: unknown,
): Promise<AccessResult> {
  const actor = await admin();
  if (!actor) return { status: "refused", error: "forbidden" };
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };
  const { projectId, clientId } = parsed.data;

  let person: { email: string; locale: "en" | "pt" } | null;
  if (isFakeBackendEnabled()) {
    person = fakeFindPerson(clientId);
  } else {
    const { data } = await (
      await getPortalSupabase()
    )
      .from("project_clients")
      .select("email, locale")
      .eq("id", clientId)
      .eq("project_id", projectId)
      .neq("status", "removed")
      .maybeSingle();
    person = data
      ? { email: data.email, locale: data.locale === "en" ? "en" : "pt" }
      : null;
  }
  if (!person) return { status: "refused", error: "notFound" };

  if (!(await sendWelcome(projectId, person))) {
    return { status: "refused", error: "failed" };
  }
  await logInvite(projectId, person.email, actor);
  return { status: "saved" };
}

export async function removePersonAction(
  input: unknown,
): Promise<AccessResult> {
  const actor = await admin();
  if (!actor) return { status: "refused", error: "forbidden" };
  const parsed = personSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };
  const { projectId, clientId } = parsed.data;

  if (isFakeBackendEnabled()) {
    const answer = fakeRemovePerson(clientId, actor.name);
    if (answer === "ok") return { status: "saved" };
    return {
      status: "refused",
      error: answer === "last_person" ? "lastPerson" : "notFound",
    };
  }
  const { error } = await (
    await getPortalSupabase()
  ).rpc("portal_remove_client", {
    p_project_id: projectId,
    p_client_id: clientId,
  });
  return error ? refused("remove_client", error) : { status: "saved" };
}

export async function rotateProjectIdAction(
  input: unknown,
): Promise<RotateResult> {
  const actor = await admin();
  if (!actor) return { status: "refused", error: "forbidden" };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };
  const { projectId } = parsed.data;

  let publicId: string;
  let people: { email: string; locale: "en" | "pt" }[];
  if (isFakeBackendEnabled()) {
    ({ publicId, people } = fakeRotate(actor.name));
  } else {
    const { data, error } = await (
      await getPortalSupabase()
    ).rpc("portal_rotate_project_id", { p_project_id: projectId });
    if (error) return refused("rotate_project_id", error);
    // One row per person who can sign in; the last-person rule means there's always one.
    const first = data.at(0);
    if (!first) return { status: "refused", error: "failed" };
    publicId = first.public_id;
    people = data.map((row) => ({
      email: row.email,
      locale: row.locale === "en" ? "en" : "pt",
    }));
  }

  // Everyone is already signed out; the emails only carry the new ID.
  const sent = await Promise.all(
    people.map((person) => sendWelcome(projectId, person, publicId)),
  );
  const emailed = sent.filter(Boolean).length;
  return {
    status: "rotated",
    publicId,
    emailed,
    failed: sent.length - emailed,
  };
}

export async function clearLockoutAction(
  input: unknown,
): Promise<AccessResult> {
  const actor = await admin();
  if (!actor) return { status: "refused", error: "forbidden" };
  const parsed = lockoutSchema.safeParse(input);
  if (!parsed.success) return { status: "refused", error: "notFound" };
  const { projectId, email } = parsed.data;

  if (isFakeBackendEnabled()) {
    return fakeClearLockout(email, actor.name)
      ? { status: "saved" }
      : { status: "refused", error: "notFound" };
  }
  const { data, error } = await (
    await getPortalSupabase()
  ).rpc("portal_clear_lockout", {
    p_project_id: projectId,
    p_email: email,
  });
  if (error) return refused("clear_lockout", error);
  return data ? { status: "saved" } : { status: "refused", error: "notFound" };
}
