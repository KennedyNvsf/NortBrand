import { describe, expect, it } from "vitest";

import pt from "../../../../messages/pt.json";

import {
  renderPortalDigest,
  renderPortalFirstSignIn,
  renderPortalUpdate,
  renderPortalWelcome,
} from "./render";

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

  it("says the Project ID changed when it was rotated (#141)", async () => {
    const email = await renderPortalWelcome({
      ...welcome,
      locale: "en",
      projectId: "NB-7310",
      newId: true,
    });
    expect(email.subject).toBe(`A new Project ID for ${welcome.projectName}`);
    expect(email.text).toContain("NB-7310");
    expect(email.text).toContain("you've been signed out");
  });
});

describe("renderPortalUpdate", () => {
  const notice = {
    projectName: "Atlântico Café website",
    publicId: "NB-4821",
    authorName: "Ana Costa",
    body: "Development is complete.\nWe're now reviewing <everything> before launch.",
    siteUrl: "https://nortbrand.pt",
  } as const;

  it("carries the team's words, escaped, and links the project's portal", async () => {
    const email = await renderPortalUpdate({ ...notice, locale: "en" });
    expect(email.subject).toBe(
      "Atlântico Café website: an update from Ana Costa",
    );
    expect(email.html).toContain("&lt;everything&gt;");
    expect(email.html).not.toContain("<everything>");
    expect(email.html).toContain(
      'href="https://nortbrand.pt/en/portal/NB-4821"',
    );
    expect(email.text).toContain("Development is complete.");
    expect(email.html).not.toMatch(/<img|src=|<script/i);
  });

  it("writes Portuguese to a Portuguese client", async () => {
    const email = await renderPortalUpdate({ ...notice, locale: "pt" });
    expect(email.html).toContain('lang="pt"');
    expect(email.html).toContain(
      'href="https://nortbrand.pt/pt/portal/NB-4821"',
    );
  });
});

describe("renderPortalUpdate · Needs you", () => {
  it("says the team needs something, in the subject and the heading", async () => {
    const email = await renderPortalUpdate({
      locale: "en",
      projectName: "Café website",
      publicId: "NB-9901",
      authorName: "Ana Costa",
      body: "We need the menu photos.",
      siteUrl: "https://nortbrand.pt",
      needsClient: true,
    });
    expect(email.subject).toBe(
      "Café website: Ana Costa needs something from you",
    );
    expect(email.html).toContain("Your team needs something from you");
  });
});

describe("renderPortalDigest", () => {
  const digest = {
    projectName: "Café website",
    publicId: "NB-9901",
    siteUrl: "https://nortbrand.pt",
    updates: [
      {
        author: "Rui Matos",
        body: "Hero is in.",
        createdAt: "2026-11-15T10:20:00Z",
        highlight: false,
        needsClient: false,
      },
      {
        author: null,
        body: "Design stage complete.",
        createdAt: "2026-11-15T16:05:00Z",
        highlight: true,
        needsClient: false,
      },
      {
        author: "Ana Costa",
        body: "We need the menu photos.",
        createdAt: "2026-11-15T17:45:00Z",
        highlight: false,
        needsClient: true,
      },
    ],
  } as const;

  it("lists the day's posts with Lisbon times, tags as text and the portal link", async () => {
    const email = await renderPortalDigest({
      ...digest,
      updates: [...digest.updates],
      locale: "en",
    });
    expect(email.subject).toBe("Café website: today's updates");
    expect(email.text).toContain("Rui Matos · 10:20");
    expect(email.text).toContain("Your team · 16:05");
    expect(email.html).toContain("Needs you");
    expect(email.html).toContain("Milestone");
    expect(email.html).toContain(
      'href="https://nortbrand.pt/en/portal/NB-9901"',
    );
    expect(email.html).not.toMatch(/<img|src=|<script/i);
  });

  it("writes Portuguese to a Portuguese client", async () => {
    const email = await renderPortalDigest({
      ...digest,
      updates: [...digest.updates],
      locale: "pt",
    });
    expect(email.html).toContain('lang="pt"');
    expect(email.html).toContain("Precisa de si");
    expect(email.subject).toBe("Café website: as novidades de hoje");
  });
});

describe("renderPortalFirstSignIn", () => {
  it("tells the lead which client signed in and links Client access", async () => {
    const email = await renderPortalFirstSignIn({
      leadName: "Tiago Sousa",
      clientEmail: "joao@client.example",
      projectName: "Atlântico Café website",
      publicId: "NB-9961",
      siteUrl: "https://nortbrand.pt/",
    });
    expect(email.subject).toBe(
      "joao@client.example signed in to Atlântico Café website",
    );
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain(
      'href="https://nortbrand.pt/team/projects/NB-9961/access"',
    );
    expect(email.text).toContain("Hi Tiago Sousa");
  });
});
