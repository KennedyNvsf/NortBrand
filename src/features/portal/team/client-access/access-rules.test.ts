import { describe, expect, it } from "vitest";

import {
  addPersonSchema,
  canRemove,
  conflictFor,
  personState,
  type ClientPerson,
} from "./access-rules";

const PROJECT = "00000000-0000-4000-b000-000000000001";
const person = (overrides: Partial<ClientPerson> = {}): ClientPerson => ({
  id: "00000000-0000-4000-a000-000000000001",
  email: "joao@atlantico.pt",
  name: "João Marques",
  locale: "pt",
  status: "active",
  invitedAt: "2026-11-01T10:00:00Z",
  lastSignInAt: "2026-11-15T09:14:00Z",
  ...overrides,
});
const NOW = new Date("2026-11-15T14:20:00Z");

describe("addPersonSchema", () => {
  it("normalises the email and treats a blank name as none", () => {
    expect(
      addPersonSchema.parse({
        projectId: PROJECT,
        email: " Marta@Atlantico.PT ",
        name: "  ",
        locale: "pt",
      }),
    ).toEqual({
      projectId: PROJECT,
      email: "marta@atlantico.pt",
      name: null,
      locale: "pt",
    });
  });

  it("names what's wrong with the email", () => {
    const result = addPersonSchema.safeParse({
      projectId: PROJECT,
      email: "marta@",
      name: "",
      locale: "en",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("emailInvalid");
  });
});

describe("personState", () => {
  it("shows a pause first, while it lasts", () => {
    const lockouts = [
      {
        email: "joao@atlantico.pt",
        lockedAt: "2026-11-15T14:15:00Z",
        unlocksAt: "2026-11-15T14:30:00Z",
      },
    ];
    expect(personState(person(), lockouts, NOW).kind).toBe("locked");
    expect(
      personState(person(), lockouts, new Date("2026-11-15T14:31:00Z")).kind,
    ).toBe("active");
  });

  it("is invited until the first sign-in", () => {
    expect(
      personState(person({ status: "invited", lastSignInAt: null }), [], NOW),
    ).toEqual({ kind: "invited", invitedAt: "2026-11-01T10:00:00Z" });
  });
});

describe("canRemove", () => {
  it("keeps the last person who can sign in", () => {
    const only = person();
    const other = person({
      id: "00000000-0000-4000-a000-000000000002",
      email: "leonor@atlantico.pt",
      status: "invited",
    });
    expect(canRemove([only], only.id)).toBe(false);
    expect(canRemove([only, other], only.id)).toBe(true);
  });
});

describe("conflictFor", () => {
  it("reads the reason from a PT409 message", () => {
    expect(conflictFor("last_person")).toBe("lastPerson");
    expect(conflictFor("already_added")).toBe("alreadyAdded");
    expect(conflictFor("client_is_teammate")).toBe("isTeammate");
    expect(conflictFor("something else")).toBeNull();
  });
});
