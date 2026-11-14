import { e2eUserId } from "../auth/e2e-backend";
import type { TeamRequestCode, TeamVerifyCode } from "../auth/schema";
import type { TeamRole } from "./team-admin";

/**
 * A fake team backend for Playwright (#132), used only when isFakeBackendEnabled(). The
 * rules in sign-in.ts and team-admin.ts still run for real; only Supabase is replaced.
 *
 * Fixtures (one roster per server process):
 *   admin@e2e.example   E2E Admin, admin
 *   member@e2e.example  E2E Member, member
 *   ratelimited@e2e.example → too many requests; anyone else → no_match
 *   The code is 123456. Invites to `…@outside.example` fall outside the allowed domain.
 */

export const E2E_TEAM_COOKIE = "nb_team_e2e";
export const E2E_TEAM_CODE = "123456";

type FakeMember = { name: string; role: TeamRole; active: boolean };

const roster = new Map<string, FakeMember>([
  ["admin@e2e.example", { name: "E2E Admin", role: "admin", active: true }],
  ["member@e2e.example", { name: "E2E Member", role: "member", active: true }],
]);
const misses = new Map<string, number>();
const MAX_TRIES = 3;

/** The fake user id, also used as the session marker's user (shared with clients). */
export const e2eTeamUserId = e2eUserId;

function emailOf(userId: string): string | undefined {
  return [...roster.keys()].find((email) => e2eUserId(email) === userId);
}

export function fakeTeamMember(
  email: string,
): (FakeMember & { userId: string; email: string }) | null {
  const member = roster.get(email);
  return member?.active
    ? { ...member, email, userId: e2eTeamUserId(email) }
    : null;
}

export function fakeTeamMemberById(userId: string) {
  const email = emailOf(userId);
  return email ? fakeTeamMember(email) : null;
}

export function fakeTeamRoster() {
  return [...roster.entries()]
    .filter(([, member]) => member.active)
    .map(([email, member]) => ({
      ...member,
      email,
      userId: e2eTeamUserId(email),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function fakeTeamBegin(
  request: TeamRequestCode,
): Promise<"ok" | "no_match" | "locked" | { error: { code: string } }> {
  if (request.email === "ratelimited@e2e.example") {
    return Promise.resolve({ error: { code: "PT429" } });
  }
  if (!fakeTeamMember(request.email)) return Promise.resolve("no_match");
  misses.set(request.email, 0);
  return Promise.resolve("ok");
}

export function fakeTeamCodeState(
  request: TeamVerifyCode,
): Promise<"active" | "expired" | "locked"> {
  if (!fakeTeamMember(request.email)) return Promise.resolve("expired");
  return Promise.resolve(
    (misses.get(request.email) ?? 0) >= MAX_TRIES ? "locked" : "active",
  );
}

export function fakeTeamVerify(
  request: TeamVerifyCode,
): Promise<"ok" | "mismatch"> {
  return Promise.resolve(request.code === E2E_TEAM_CODE ? "ok" : "mismatch");
}

export function fakeTeamRegisterWrongCode(
  request: TeamVerifyCode,
): Promise<number> {
  const count = (misses.get(request.email) ?? 0) + 1;
  misses.set(request.email, count);
  return Promise.resolve(Math.max(MAX_TRIES - count, 0));
}

export function fakeCheckInvite(
  email: string,
): Promise<
  | { status: "ok"; userId: string | null }
  | { status: "domain_not_allowed" | "already_member" }
> {
  if (email.endsWith("@outside.example"))
    return Promise.resolve({ status: "domain_not_allowed" });
  if (fakeTeamMember(email))
    return Promise.resolve({ status: "already_member" });
  return Promise.resolve({
    status: "ok",
    userId: roster.has(email) ? e2eTeamUserId(email) : null,
  });
}

export function fakeAddMember(
  userId: string,
  name: string,
  role: TeamRole,
): Promise<"ok" | { error: { code: string } }> {
  const email = emailOf(userId) ?? pendingInvites.get(userId);
  if (!email) return Promise.resolve({ error: { code: "P0002" } });
  roster.set(email, { name, role, active: true });
  return Promise.resolve("ok");
}

/** Fake "auth users" created for invites, until they're added to the roster. */
const pendingInvites = new Map<string, string>();

export function fakeCreateAuthUser(
  email: string,
): Promise<{ ok: true; userId: string }> {
  const userId = e2eUserId(email);
  pendingInvites.set(userId, email);
  return Promise.resolve({ ok: true, userId });
}

export function fakeRemoveMember(
  userId: string,
): Promise<"ok" | { error: { code: string } }> {
  const email = emailOf(userId);
  const member = email ? roster.get(email) : undefined;
  if (!member?.active) return Promise.resolve({ error: { code: "P0002" } });
  member.active = false;
  return Promise.resolve("ok");
}
