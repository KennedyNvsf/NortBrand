import { unsubscribeNewsletter } from "@/features/newsletter/actions";

/**
 * RFC 8058 one-click unsubscribe. A mail client that shows an Unsubscribe button POSTs
 * `List-Unsubscribe=One-Click` here, with the signed `?email=&token=` from the
 * `List-Unsubscribe` header (links.ts › oneClickUnsubscribeUrl). There is no GET: a
 * link scanner opening the URL must not unsubscribe anyone, and people use the
 * unsubscribe page (#41) instead.
 */
export async function POST(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const result = await unsubscribeNewsletter({
    email: searchParams.get("email") ?? undefined,
    token: searchParams.get("token") ?? undefined,
  });

  const status = { unsubscribed: 200, invalid: 400, failed: 500 }[
    result.status
  ];
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
