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
import {
  createProject,
  type CreateProjectResult,
  type NewProject,
} from "./create-project";
import {
  fakeCreateProject,
  fakeFindAccounts,
  fakeSendWelcome,
} from "./e2e-store";

/*
 * New project with client invite (#136). The input is untrusted and validated again in
 * create-project.ts; the role is checked there and in every SQL function. Auth users are
 * created with the service role (auth administration only, ADR-009); every table write
 * runs under the admin's own session, so RLS and the SQL checks apply. Only Postgres and
 * Resend error codes are ever reported.
 */

const report = reportPortalFailure("portal-team-admin");

function rpcStages(project: NewProject) {
  return project.stages.map((stage) => ({
    name: stage.name,
    starts_on: stage.startsOn,
    ends_on: stage.endsOn,
  }));
}

function rpcClients(project: NewProject) {
  return project.clients.map((client) => ({
    email: client.email,
    locale: client.locale,
    user_id: client.userId,
  }));
}

export async function createProjectAction(
  input: unknown,
): Promise<CreateProjectResult> {
  const fake = isFakeBackendEnabled();
  const portal = fake ? null : await getPortalSupabase();
  const leadName = async (leadId: string) =>
    (await listTeammates()).find((person) => person.userId === leadId)?.name ??
    "NortBrand";

  return createProject(input, {
    viewer: getTeamViewer,
    findAccounts: async (emails) => {
      if (!portal) return fakeFindAccounts(emails);
      const { data, error } = await portal.rpc("portal_find_client_users", {
        p_emails: emails,
      });
      if (error) return { error: { code: error.code } };
      return data.map((row) => ({
        email: row.email,
        userId: row.user_id,
        isTeammate: row.is_teammate,
      }));
    },
    createAuthUser: (email) =>
      fake ? fakeCreateAuthUser(email) : createAuthUser(email),
    deleteAuthUser: (userId) =>
      fake ? Promise.resolve() : deleteAuthUser(userId),
    createProject: async (project) => {
      if (!portal)
        return fakeCreateProject(project, await leadName(project.leadId));
      const { data, error } = await portal.rpc("portal_create_project", {
        p_name: project.name,
        p_client_name: project.clientName,
        p_lead_id: project.leadId,
        p_starts_on: project.startsOn,
        p_launches_on: project.launchesOn,
        // The RPC types say string; SQL treats a blank one as "generate".
        p_public_id: project.suggestedId ?? "",
        p_stages: rpcStages(project),
        p_clients: rpcClients(project),
      });
      if (error) return { error: { code: error.code } };
      const row = data.at(0);
      return row
        ? { projectId: row.project_id, publicId: row.public_id }
        : { error: { code: "unexpected_answer" } };
    },
    sendWelcome: async (welcome) => {
      if (fake) return fakeSendWelcome(welcome);
      const email = await renderPortalWelcome({
        email: welcome.email,
        locale: welcome.locale,
        projectId: welcome.publicId,
        projectName: welcome.projectName,
        clientName: welcome.clientName,
        leadName: await leadName(welcome.leadId),
        siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL,
      });
      const sent = await sendEmail({ to: welcome.email, ...email });
      if (!sent.ok) report("send_welcome", sent.code);
      return sent.ok;
    },
    logInviteSent: async (projectId, email) => {
      if (!portal) return "ok";
      const { error } = await portal.rpc("portal_log_invite_sent", {
        p_project_id: projectId,
        p_email: email,
      });
      return error ? { error: { code: error.code } } : "ok";
    },
    reportFailure: report,
  });
}
