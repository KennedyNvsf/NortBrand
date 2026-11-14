import { describe, expect, it } from "vitest";

import pt from "../../../../messages/pt.json";

import { renderPortalWelcome } from "./render";

const welcome = {
  email: "ines@tascadolargo.pt",
  projectId: "NB-4826",
  projectName: "Tasca do Largo · Website",
  clientName: "Tasca do Largo",
  leadName: "Ana Costa",
  siteUrl: "https://nortbrand.pt/",
} as const;

describe("renderPortalWelcome", () => {
  it("carries the Project ID and the sign-in link for the client's language", async () => {
    const email = await renderPortalWelcome({ ...welcome, locale: "en" });
    expect(email.subject).toBe(
      "Your project portal for Tasca do Largo · Website",
    );
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain("NB-4826");
    expect(
      email.html.split('href="https://nortbrand.pt/en/portal"'),
    ).toHaveLength(3);
    expect(email.text).toContain("https://nortbrand.pt/en/portal");
    expect(email.text).toContain("ines@tascadolargo.pt");
    expect(email.html).toContain("Ana Costa");
    // No images or scripts, so nothing loads remotely or tracks an open.
    expect(email.html).not.toMatch(/<img\b|\bsrc=|<script\b/i);
  });

  it("writes Portuguese to a Portuguese client", async () => {
    const email = await renderPortalWelcome({ ...welcome, locale: "pt" });
    expect(email.html).toContain('lang="pt"');
    expect(email.html).toContain('href="https://nortbrand.pt/pt/portal"');
    expect(email.subject).toBe(
      pt.Emails.portalWelcome.subject.replace("{project}", welcome.projectName),
    );
  });
});
