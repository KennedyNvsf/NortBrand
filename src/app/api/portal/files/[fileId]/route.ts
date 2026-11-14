import { NextResponse } from "next/server";
import { z } from "zod";

import { getPortalViewer } from "@/features/portal/auth/access";
import { E2E_PROJECT_VIEW } from "@/features/portal/overview/e2e-fixture";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";
import { getPortalSupabase } from "@/lib/supabase/auth";

/*
 * Download a portal file (#135): a short-lived signed URL, created with the reader's own
 * session, so two rules apply. The project_files row is read under RLS (a client sees
 * only shared files of their own projects), and Storage's read rule repeats the check
 * (portal_files_read). Anything else is a plain 404, the same for "doesn't exist" and
 * "not yours". The link lives 60 seconds and nothing here is cached.
 */

const SIGNED_URL_SECONDS = 60;
const NO_STORE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function downloadName(name: string, contentType: string): string {
  const extension = EXTENSIONS[contentType];
  if (!extension || name.toLowerCase().endsWith(`.${extension}`)) return name;
  return `${name}.${extension}`;
}

const notFound = () =>
  new NextResponse(null, { status: 404, headers: NO_STORE });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const parsed = z.uuid().safeParse((await params).fileId);
  if (!parsed.success) return notFound();
  const fileId = parsed.data;

  const viewer = await getPortalViewer();
  if (viewer.status !== "signed_in") {
    return new NextResponse(null, { status: 401, headers: NO_STORE });
  }

  if (isFakeBackendEnabled()) {
    const file = E2E_PROJECT_VIEW.files.find((entry) => entry.id === fileId);
    if (!file) return notFound();
    return NextResponse.redirect(`https://files.e2e.example/${file.id}`, {
      status: 302,
      headers: NO_STORE,
    });
  }

  const supabase = await getPortalSupabase();
  const { data: file } = await supabase
    .from("project_files")
    .select("storage_path, name, content_type")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return notFound();

  const { data: signed, error } = await supabase.storage
    .from("portal-files")
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, {
      download: downloadName(file.name, file.content_type),
    });
  if (error) return notFound();

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: NO_STORE,
  });
}
