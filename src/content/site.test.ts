import { describe, expect, it } from "vitest";

import { hasPlaceholders, site } from "./site";

describe("site config", () => {
  it("stores the phone in E.164 so tel: links work", () => {
    expect(site.contact.phone.value).toMatch(/^\+[1-9]\d{6,14}$/);
  });

  it("uses https for every social link", () => {
    for (const link of site.social) expect(link.href).toMatch(/^https:\/\//);
  });

  // Flip this expectation to `false` once the client confirms the real details.
  it("still flags placeholder contact details before launch", () => {
    expect(hasPlaceholders()).toBe(true);
  });
});
