import { z } from "zod";

import type { TeamViewer } from "../team-admin";
import {
  STAGE_TEMPLATE_IDS,
  spreadStages,
  type PlannedStage,
} from "./templates";

/*
 * New project with client invite (#136, ADR-009), free of Next.js and Supabase so it can
 * be tested with fakes; actions.ts supplies the real dependencies.
 *
 *   admin? → validate (zod) → stages from the template (never from the browser)
 *   → look up the clients' accounts (refuse teammates' emails)
 *   → create the missing auth users (auth administration, service role)
 *   → one SQL transaction: project, lead, stages, clients
 *   → welcome emails, one per client, in their language.
 *
 * If the transaction fails, the auth users created for it are deleted again, so a failed
 * create leaves nothing behind. A failed email does not undo anything: the project
 * stays, and the result names the addresses to resend to from Client access.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "emailInvalid")
  .pipe(z.email("emailInvalid"));

const isoDate = z.iso.date("dateInvalid");

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "nameInvalid").max(120, "nameInvalid"),
    clientName: z
      .string()
      .trim()
      .min(1, "clientNameInvalid")
      .max(120, "clientNameInvalid"),
    leadId: z.uuid("leadInvalid"),
    startsOn: isoDate,
    launchesOn: isoDate,
    template: z.enum(STAGE_TEMPLATE_IDS, "templateInvalid"),
    emails: z
      .array(email)
      .min(1, "emailsRequired")
      .max(10, "emailsTooMany")
      .transform((list) => [...new Set(list)]),
    locale: z.enum(["en", "pt"], "localeInvalid"),
    suggestedId: z
      .string()
      .regex(/^NB-\d{4}$/)
      .optional()
      .catch(undefined),
    sendWelcome: z.boolean(),
  })
  .refine((input) => input.launchesOn >= input.startsOn, {
    path: ["launchesOn"],
    message: "launchBeforeStart",
  });

export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const CREATE_FIELDS = [
  "name",
  "clientName",
  "leadId",
  "startsOn",
  "launchesOn",
  "template",
  "emails",
  "locale",
] as const;
type CreateField = (typeof CREATE_FIELDS)[number];

export const CREATE_ERRORS = [
  "nameInvalid",
  "clientNameInvalid",
  "leadInvalid",
  "dateInvalid",
  "launchBeforeStart",
  "launchTooSoon",
  "templateInvalid",
  "emailInvalid",
  "emailsRequired",
  "emailsTooMany",
  "localeInvalid",
] as const;
export type CreateError = (typeof CREATE_ERRORS)[number];

export type CreateFieldErrors = Partial<Record<CreateField, CreateError>>;

export type CreateProjectResult =
  | {
      status: "created";
      projectId: string;
      publicId: string;
      /** Welcome emails that went out. */
      sent: number;
      /** Addresses whose welcome email failed: resend from Client access. */
      failed: string[];
    }
  | { status: "invalid"; fieldErrors: CreateFieldErrors }
  | { status: "teammate_email"; emails: string[] }
  | { status: "forbidden" }
  | { status: "failed" };

type DbError = { error: { code: string | undefined } };

export type ClientAccount = {
  email: string;
  userId: string | null;
  isTeammate: boolean;
};

export type NewProject = {
  name: string;
  clientName: string;
  leadId: string;
  startsOn: string;
  launchesOn: string;
  suggestedId: string | null;
  stages: PlannedStage[];
  clients: { email: string; locale: "en" | "pt"; userId: string }[];
};

export type WelcomeEmail = {
  email: string;
  locale: "en" | "pt";
  projectId: string;
  publicId: string;
  projectName: string;
  clientName: string;
  leadId: string;
};

export type CreateProjectDeps = {
  viewer: () => Promise<TeamViewer>;
  findAccounts: (emails: string[]) => Promise<ClientAccount[] | DbError>;
  createAuthUser: (
    email: string,
  ) => Promise<{ ok: true; userId: string } | { ok: false; code: string }>;
  deleteAuthUser: (userId: string) => Promise<void>;
  createProject: (
    project: NewProject,
  ) => Promise<{ projectId: string; publicId: string } | DbError>;
  sendWelcome: (welcome: WelcomeEmail) => Promise<boolean>;
  logInviteSent: (projectId: string, email: string) => Promise<"ok" | DbError>;
  reportFailure: (where: string, code: string | undefined) => void;
};

function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && "error" in value;
}

function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  for (const issue of issues) {
    const field = CREATE_FIELDS.find((key) => key === issue.path[0]);
    const message =
      CREATE_ERRORS.find((key) => key === issue.message) ??
      (field === "emails" ? "emailInvalid" : undefined);
    if (field && message && !errors[field]) errors[field] = message;
  }
  return errors;
}

export async function createProject(
  input: unknown,
  deps: CreateProjectDeps,
): Promise<CreateProjectResult> {
  const viewer = await deps.viewer();
  if (viewer.status !== "signed_in" || viewer.role !== "admin") {
    return { status: "forbidden" };
  }

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const project = parsed.data;

  const stages = spreadStages(
    project.template,
    project.startsOn,
    project.launchesOn,
  );
  if (!stages) {
    return {
      status: "invalid",
      fieldErrors: { launchesOn: "launchTooSoon" },
    };
  }

  const accounts = await deps.findAccounts(project.emails);
  if (isDbError(accounts)) {
    if (accounts.error.code === "42501") return { status: "forbidden" };
    deps.reportFailure("find_accounts", accounts.error.code);
    return { status: "failed" };
  }
  const teammates = accounts
    .filter((account) => account.isTeammate)
    .map((account) => account.email);
  if (teammates.length > 0) {
    return { status: "teammate_email", emails: teammates };
  }

  // Reuse an existing account (a client on another project), or create one.
  const created: string[] = [];
  const clients: NewProject["clients"] = [];
  for (const address of project.emails) {
    let userId =
      accounts.find((account) => account.email === address)?.userId ?? null;
    if (userId === null) {
      const user = await deps.createAuthUser(address);
      if (!user.ok) {
        deps.reportFailure("create_auth_user", user.code);
        await Promise.all(created.map((id) => deps.deleteAuthUser(id)));
        return { status: "failed" };
      }
      userId = user.userId;
      created.push(userId);
    }
    clients.push({ email: address, locale: project.locale, userId });
  }

  const record: NewProject = {
    name: project.name,
    clientName: project.clientName,
    leadId: project.leadId,
    startsOn: project.startsOn,
    launchesOn: project.launchesOn,
    suggestedId: project.suggestedId ?? null,
    stages,
    clients,
  };
  let saved = await deps.createProject(record);
  // Two admins took the same Project ID at the same moment: try once more with a fresh one.
  if (isDbError(saved) && saved.error.code === "23505") {
    saved = await deps.createProject({ ...record, suggestedId: null });
  }
  if (isDbError(saved)) {
    await Promise.all(created.map((id) => deps.deleteAuthUser(id)));
    switch (saved.error.code) {
      case "42501":
        return { status: "forbidden" };
      case "PT409":
        return { status: "teammate_email", emails: project.emails };
      case "P0002":
        return { status: "invalid", fieldErrors: { leadId: "leadInvalid" } };
      default:
        deps.reportFailure("create_project", saved.error.code);
        return { status: "failed" };
    }
  }

  let sent = 0;
  const failed: string[] = [];
  if (project.sendWelcome) {
    for (const client of clients) {
      const ok = await deps.sendWelcome({
        email: client.email,
        locale: client.locale,
        projectId: saved.projectId,
        publicId: saved.publicId,
        projectName: project.name,
        clientName: project.clientName,
        leadId: project.leadId,
      });
      if (!ok) {
        failed.push(client.email);
        continue;
      }
      sent += 1;
      const logged = await deps.logInviteSent(saved.projectId, client.email);
      if (isDbError(logged))
        deps.reportFailure("log_invite", logged.error.code);
    }
  }

  return {
    status: "created",
    projectId: saved.projectId,
    publicId: saved.publicId,
    sent,
    failed,
  };
}
