import { describe, expect, it } from "vitest";

import {
  CONFIRM_TTL_SECONDS,
  checkConfirmToken,
  checkUnsubscribeToken,
  confirmToken,
  confirmUrl,
  oneClickUnsubscribeUrl,
  unsubscribeToken,
  unsubscribeUrl,
} from "./links";

// The secret and vectors from supabase/tests (#36): a token signed here must verify in SQL.
const secret = "test-secret-0123456789abcdef0123456789";
const email = "ana@example.com";
const issuedAt = 1_700_000_000;
const CONFIRM_VECTOR = "QGarSH8806G_BeOERWNKMVOnGN5hhKLabFIabU3Fngo";
const UNSUBSCRIBE_VECTOR = "QcQyEaQAdgoas-1uK3mWvuMc9xqCuR6myajF0Nk-SDE";

describe("newsletter tokens", () => {
  it("match the tokens Postgres computes", () => {
    expect(confirmToken(secret, email, issuedAt)).toBe(CONFIRM_VECTOR);
    expect(unsubscribeToken(secret, email)).toBe(UNSUBSCRIBE_VECTOR);
  });

  it("differ by purpose, so an unsubscribe token never confirms", () => {
    expect(
      checkConfirmToken(
        secret,
        { email, issuedAt, token: UNSUBSCRIBE_VECTOR },
        issuedAt,
      ),
    ).toBe("invalid");
  });
});

describe("checkConfirmToken", () => {
  const link = { email, issuedAt, token: CONFIRM_VECTOR };

  it("accepts a genuine link until seven days have passed", () => {
    expect(checkConfirmToken(secret, link, issuedAt)).toBe("ok");
    expect(
      checkConfirmToken(secret, link, issuedAt + CONFIRM_TTL_SECONDS),
    ).toBe("ok");
  });

  it("calls a genuine link older than seven days expired", () => {
    expect(
      checkConfirmToken(secret, link, issuedAt + CONFIRM_TTL_SECONDS + 1),
    ).toBe("expired");
  });

  it("rejects a link issued in the future", () => {
    expect(checkConfirmToken(secret, link, issuedAt - 1)).toBe("invalid");
  });

  it("rejects any tampering", () => {
    const now = issuedAt + 60;
    // Another address, or a later issue time to dodge the expiry.
    expect(
      checkConfirmToken(secret, { ...link, email: "bo@example.com" }, now),
    ).toBe("invalid");
    expect(
      checkConfirmToken(secret, { ...link, issuedAt: issuedAt + 1 }, now),
    ).toBe("invalid");
    // One character changed, a truncated token, an empty one.
    const flipped = `${CONFIRM_VECTOR.slice(0, -1)}${CONFIRM_VECTOR.endsWith("o") ? "p" : "o"}`;
    expect(checkConfirmToken(secret, { ...link, token: flipped }, now)).toBe(
      "invalid",
    );
    expect(
      checkConfirmToken(
        secret,
        { ...link, token: CONFIRM_VECTOR.slice(0, 20) },
        now,
      ),
    ).toBe("invalid");
    expect(checkConfirmToken(secret, { ...link, token: "" }, now)).toBe(
      "invalid",
    );
    // Signed with another secret.
    expect(
      checkConfirmToken("another-secret-0123456789abcdef0123", link, now),
    ).toBe("invalid");
  });
});

describe("checkUnsubscribeToken", () => {
  it("accepts only the address's own token", () => {
    expect(
      checkUnsubscribeToken(secret, { email, token: UNSUBSCRIBE_VECTOR }),
    ).toBe(true);
    expect(
      checkUnsubscribeToken(secret, {
        email: "bo@example.com",
        token: UNSUBSCRIBE_VECTOR,
      }),
    ).toBe(false);
    expect(
      checkUnsubscribeToken(secret, { email, token: CONFIRM_VECTOR }),
    ).toBe(false);
  });
});

describe("link URLs", () => {
  const site = "https://nortbrand.com";

  it("builds the confirm page link with the signed issue time", () => {
    const url = new URL(confirmUrl(site, "pt", email, issuedAt, secret));
    expect(url.origin + url.pathname).toBe(
      "https://nortbrand.com/pt/newsletter/confirm",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      email,
      issued: String(issuedAt),
      token: CONFIRM_VECTOR,
    });
  });

  it("encodes addresses with URL-significant characters", () => {
    const tricky = "ana+news&x=1@example.com";
    const url = new URL(confirmUrl(site, "en", tricky, issuedAt, secret));
    expect(url.searchParams.get("email")).toBe(tricky);
    expect(url.searchParams.get("token")).toBe(
      confirmToken(secret, tricky, issuedAt),
    );
  });

  it("builds the unsubscribe page and one-click links", () => {
    const page = new URL(unsubscribeUrl(site, "en", email, secret));
    expect(page.pathname).toBe("/en/newsletter/unsubscribe");
    expect(page.searchParams.get("token")).toBe(UNSUBSCRIBE_VECTOR);

    const oneClick = new URL(oneClickUnsubscribeUrl(site, email, secret));
    expect(oneClick.pathname).toBe("/api/newsletter/unsubscribe");
    expect(Object.fromEntries(oneClick.searchParams)).toEqual({
      email,
      token: UNSUBSCRIBE_VECTOR,
    });
  });
});
