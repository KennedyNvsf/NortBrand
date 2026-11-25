import { describe, expect, it } from "vitest";

import { site, unconfirmedSiteDetails, type SiteConfig } from "./site";

describe("site config", () => {
  it("uses https for every social link", () => {
    for (const link of site.social) expect(link.href).toMatch(/^https:\/\//);
  });

  it("links the confirmed NortBrand profiles (#171)", () => {
    expect(
      site.social.map(({ network, href, placeholder }) => ({
        network,
        href,
        placeholder,
      })),
    ).toEqual([
      {
        network: "instagram",
        href: "https://www.instagram.com/nortbrand_pt/",
        placeholder: false,
      },
      {
        network: "linkedin",
        href: "https://www.linkedin.com/company/nortbrand/",
        placeholder: false,
      },
    ]);
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

  it("narrows to the groups asked for (release builds check contact only)", () => {
    const mixed: SiteConfig = {
      ...confirmed,
      contact: {
        ...confirmed.contact,
        email: { ...confirmed.contact.email, placeholder: true },
      },
      social: confirmed.social.map((link) => ({ ...link, placeholder: true })),
    };
    expect(unconfirmedSiteDetails(mixed, ["contact"])).toEqual([
      "contact.email",
    ]);
    expect(unconfirmedSiteDetails(mixed, ["social"])).toEqual([
      "social.instagram",
    ]);
  });

  it("has no unconfirmed details, so release builds and check:release pass", () => {
    expect(unconfirmedSiteDetails(site)).toEqual([]);
  });

  it("checks the real site config by default", () => {
    expect(unconfirmedSiteDetails()).toEqual(unconfirmedSiteDetails(site));
  });
});
