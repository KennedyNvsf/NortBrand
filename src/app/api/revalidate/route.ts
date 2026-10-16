import { revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import type { NextRequest } from "next/server";

import { getServerEnv } from "@/env";
import { tagsFor } from "@/features/blog/cache-tags";

/*
 * The Sanity webhook (ADR-003): Sanity POSTs here when a blog document is published,
 * changed or deleted. The signature is checked against SANITY_REVALIDATE_SECRET before
 * anything else; an unsigned or wrongly signed call changes nothing (401). The webhook's
 * projection only needs `{ _type }` (runbook: environments.md › Sanity).
 *
 * `parseBody` also waits for the Content Lake to be consistent, so the pages rebuilt
 * after this see the new content. Tags expire at once (`expire: 0`): the next visitor
 * gets the new version, not one more stale page.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const { isValidSignature, body } = await parseBody<{ _type?: unknown }>(
    request,
    getServerEnv().SANITY_REVALIDATE_SECRET,
    true,
  );

  if (isValidSignature !== true) {
    return Response.json(
      { revalidated: false, reason: "invalid signature" },
      { status: 401 },
    );
  }
  if (typeof body?._type !== "string") {
    return Response.json(
      { revalidated: false, reason: "no document type" },
      { status: 400 },
    );
  }

  const tags = tagsFor(body._type);
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags.length > 0, tags });
}
