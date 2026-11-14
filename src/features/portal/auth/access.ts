import { cookies } from "next/headers";
import { connection } from "next/server";

import { getServerEnv } from "@/env";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

import {
  E2E_PORTAL_COOKIE,
  E2E_PORTAL_PROJECT_ID,
  E2E_PORTAL_PROJECT_NAME,
  e2eUserId,
} from "./e2e-backend";
import { isValidSessionMarker, PORTAL_SESSION_COOKIE } from "./session-marker";

/*
 * Who is looking at a portal page (#131). Server-only: pages call it before rendering
 * anything. A session counts only with a valid 30-day marker (session-marker.ts). Which
 * project the user may see is decided by RLS: a project the user can't read simply
 * isn't returned, so a guessed Project ID behaves like a missing one.
 */

export type PortalProject = { id: string; publicId: string; name: string };

export type PortalViewer =
  | { status: "signed_in"; userId: string }
  | { status: "signed_out" }
  | { status: "anonymous" };

const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token/;

export async function getPortalViewer(): Promise<PortalViewer> {
  // Always per request: the marker check reads the clock, which Next refuses to do
  // while prerendering (even a runtime prerender that has the cookies).
  await connection();
  const cookieStore = await cookies();
  const marker = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  const secret = getServerEnv().NEWSLETTER_TOKEN_SECRET;

  if (isFakeBackendEnabled()) {
    const email = cookieStore.get(E2E_PORTAL_COOKIE)?.value;
    if (!email) return { status: marker ? "signed_out" : "anonymous" };
    return isValidSessionMarker(marker, secret, e2eUserId(email), Date.now())
      ? { status: "signed_in", userId: e2eUserId(email) }
      : { status: "signed_out" };
  }

  const hadSession =
    marker !== undefined ||
    cookieStore.getAll().some(({ name }) => SUPABASE_AUTH_COOKIE.test(name));
  const supabase = await getPortalSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: hadSession ? "signed_out" : "anonymous" };

  return isValidSessionMarker(marker, secret, data.user.id, Date.now())
    ? { status: "signed_in", userId: data.user.id }
    : { status: "signed_out" };
}

/** The projects the signed-in client can open, newest first (RLS filters them). */
export async function getClientProjects(): Promise<PortalProject[]> {
  if (isFakeBackendEnabled()) {
    return [
      {
        id: "00000000-0000-4000-b000-00000000e2e0",
        publicId: E2E_PORTAL_PROJECT_ID,
        name: E2E_PORTAL_PROJECT_NAME,
      },
    ];
  }
  const supabase = await getPortalSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("id, public_id, name")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data.map((row) => ({
    id: row.id,
    publicId: row.public_id,
    name: row.name,
  }));
}

/** One project by its Project ID, or null when it doesn't exist for this user. */
export async function getClientProject(
  publicId: string,
): Promise<PortalProject | null> {
  const projects = await getClientProjects();
  return (
    projects.find((project) => project.publicId === publicId.toUpperCase()) ??
    null
  );
}
