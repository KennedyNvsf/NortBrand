import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

/*
 * The client digest (#139; Figma TM-13 "Client digest · Daily at 18:00"), free of
 * Next.js and Supabase; the cron route supplies the real dependencies.
 *
 *   Vercel Cron (twice: 17:00 and 18:00 UTC, so 18:00 Lisbon in winter and summer)
 *   → the route checks `Authorization: Bearer <CRON_SECRET>` (constant time)
 *   → before 18:00 Lisbon: nothing to do
 *   → portal_claim_digests(secret): SQL checks the secret again and CLAIMS each due
 *     client's digest for today (unique client + day), returning only those
 *   → one email per claimed client, in their language.
 *
 * At most once per client per day: the claim happens before sending, so a second run,
 * a retry or a slow request never sends twice. A failed send is counted and reported
 * (no personal data) and not retried that day.
 */

export const DIGEST_HOUR = 18;

export function isAuthorizedCron(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** True from 18:00 in Lisbon (the office's time zone), whatever the server's. */
export function digestIsDue(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  return hour >= DIGEST_HOUR;
}

const digestUpdate = z.object({
  author: z.string().nullable(),
  body: z.string(),
  created_at: z.string(),
  highlight: z.boolean(),
  needs_client: z.boolean(),
});

/** What portal_claim_digests returns, validated: jsonb is not typed by the generator. */
export const digestRow = z.object({
  client_email: z.email(),
  locale: z.enum(["en", "pt"]).catch("pt"),
  project_name: z.string(),
  public_id: z.string(),
  updates: z.array(digestUpdate).min(1),
});

export type DigestRow = z.infer<typeof digestRow>;

type DbError = { error: { code: string | undefined } };

export type DigestResult =
  | { status: "not_due" }
  | { status: "done"; claimed: number; sent: number; failed: number }
  | { status: "failed" };

export async function runDigest(deps: {
  now: Date;
  claim: () => Promise<unknown[] | DbError>;
  send: (row: DigestRow) => Promise<{ ok: true } | { ok: false; code: string }>;
  reportFailure: (where: string, code: string | undefined) => void;
}): Promise<DigestResult> {
  if (!digestIsDue(deps.now)) return { status: "not_due" };

  const rows = await deps.claim();
  if (!Array.isArray(rows)) {
    deps.reportFailure("claim_digests", rows.error.code);
    return { status: "failed" };
  }

  let sent = 0;
  let failed = 0;
  for (const raw of rows) {
    const row = digestRow.safeParse(raw);
    if (!row.success) {
      failed += 1;
      deps.reportFailure("digest_row", "invalid_row");
      continue;
    }
    const result = await deps.send(row.data);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      deps.reportFailure("send_digest", result.code);
    }
  }
  return { status: "done", claimed: rows.length, sent, failed };
}
