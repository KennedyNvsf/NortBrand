import { NextResponse } from "next/server";

import { fakeStoreObject } from "@/features/portal/team/files/e2e-store";
import { MAX_FILE_BYTES } from "@/features/portal/team/files/magic";
import { isFakeBackendEnabled } from "@/lib/e2e-backend";

/*
 * Stands in for Supabase Storage's signed upload URL in Playwright runs (#140). Only the
 * fake backend answers; anywhere else this route doesn't exist (404). Like Storage, it
 * refuses a body over the bucket's 50 MB limit.
 */

export async function PUT(request: Request) {
  if (!isFakeBackendEnabled()) return new NextResponse(null, { status: 404 });
  const path = new URL(request.url).searchParams.get("path");
  if (!path?.startsWith("projects/"))
    return new NextResponse(null, { status: 400 });
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_FILE_BYTES)
    return new NextResponse(null, { status: 413 });
  fakeStoreObject(path, body);
  return new NextResponse(null, { status: 200 });
}
