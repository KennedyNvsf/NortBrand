import { describe, expect, it } from "vitest";

import { parseCompletion } from "./completion";

const projectId = "20000000-0000-4000-b000-000000000001";

const row = {
  project_id: projectId,
  session_days: 7,
  notify_email: "tiago@test.example",
  notify_name: "Tiago Sousa",
  project_name: "Atlântico Café website",
  project_public_id: "NB-9961",
  client_email: "joao@client.example",
};

describe("parseCompletion", () => {
  it("reads the session length and the first sign-in notice", () => {
    expect(parseCompletion([row])).toEqual({
      projectId,
      sessionDays: 7,
      notice: {
        leadEmail: "tiago@test.example",
        leadName: "Tiago Sousa",
        projectName: "Atlântico Café website",
        publicId: "NB-9961",
        clientEmail: "joao@client.example",
      },
    });
  });

  it("has no notice after the first sign-in or with the setting off", () => {
    expect(
      parseCompletion([{ ...row, notify_email: null, notify_name: null }])
        ?.notice,
    ).toBeNull();
  });

  it("is null when nothing was completed", () => {
    expect(parseCompletion([])).toBeNull();
    expect(parseCompletion(null)).toBeNull();
    expect(parseCompletion([{ project_id: null }])).toBeNull();
  });

  it("falls back to 30 days for a missing or invalid length", () => {
    expect(parseCompletion([{ ...row, session_days: 0 }])?.sessionDays).toBe(
      30,
    );
    expect(parseCompletion([{ project_id: projectId }])?.sessionDays).toBe(30);
  });

  it("still accepts the pre-#159 answer (the project id alone)", () => {
    expect(parseCompletion(projectId)).toEqual({
      projectId,
      sessionDays: 30,
      notice: null,
    });
  });
});
