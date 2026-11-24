import { describe, expect, it } from "vitest";

import { site, unconfirmedSiteDetails, type SiteConfig } from "./site";

describe("site config", () => {
  it("uses https for every social link", () => {
    for (const link of site.social) expect(link.href).toMatch(/^https:\/\//);
  });

  it("publishes the studio mailbox on nortbrand.pt", () => {
    expect(site.contact.email).toEqual({
      value: "studio@nortbrand.pt",
      placeholder: false,
    });
  });
});

describe("unconfirmedSiteDetails (release guard, #79)", () => {
  const confirmed: SiteConfig = {
    ...site,
    contact: {
      email: { value: "studio@nortbrand.pt", placeholder: false },
      hours: { value: { opens: "9:00", closes: "18:00" }, placeholder: false },
    },
    social: [
      {
        network: "instagram",
        label: "Instagram",
        href: "https://www.instagram.com/nortbrand",
        placeholder: false,
      },
    ],
  };

  it("is empty once every detail is confirmed", () => {
    expect(unconfirmedSiteDetails(confirmed)).toEqual([]);
  });

  it("names every placeholder contact detail and social link", () => {
    expect(
      unconfirmedSiteDetails({
        ...confirmed,
        contact: {
          ...confirmed.contact,
          hours: { ...confirmed.contact.hours, placeholder: true },
        },
        social: [
          ...confirmed.social,
          {
            network: "linkedin",
            label: "LinkedIn",
            href: "https://www.linkedin.com/",
            placeholder: true,
          },
        ],
      }),
    ).toEqual(["contact.hours", "social.linkedin"]);
  });

  it("checks the real site config by default", () => {
    expect(unconfirmedSiteDetails()).toEqual(unconfirmedSiteDetails(site));
  });
});
