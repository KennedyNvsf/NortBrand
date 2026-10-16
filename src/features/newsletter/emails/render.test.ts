import { describe, expect, it } from "vitest";

import { renderNewsletterConfirmation } from "./render";

const url =
  "https://nortbrand.com/en/newsletter/confirm?email=ana%40example.com&issued=1700000000&token=QGarSH8806G_BeOERWNKMVOnGN5hhKLabFIabU3Fngo";

describe("renderNewsletterConfirmation", () => {
  it("links the confirm page, as a button and as plain text", async () => {
    const email = await renderNewsletterConfirmation(
      "ana@example.com",
      "en",
      url,
    );
    const href = url.replaceAll("&", "&amp;");

    expect(email.subject).toBe(
      "Confirm your subscription to the NortBrand newsletter",
    );
    expect(email.html).toContain('lang="en"');
    expect(email.html.split(`href="${href}"`)).toHaveLength(3);
    expect(email.html).toContain("ana@example.com");
    expect(email.html).toContain("This link works for 7 days.");
    expect(email.text).toContain(url);
    // No images or scripts, so nothing loads remotely or tracks an open.
    expect(email.html).not.toMatch(/<img\b|\bsrc=|<script\b/i);
  });

  it("uses the visitor's locale", async () => {
    const email = await renderNewsletterConfirmation(
      "ana@example.com",
      "pt",
      url,
    );
    expect(email.html).toContain('lang="pt"');
    // Pseudo-translated until the Portuguese copy arrives.
    expect(email.subject).toContain("[[");
  });
});
