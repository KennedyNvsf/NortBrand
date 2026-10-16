import { beforeEach, describe, expect, it, vi } from "vitest";

const contacts = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  segments: { add: vi.fn() },
}));

vi.mock("resend", () => ({
  Resend: class {
    contacts = contacts;
  },
}));

vi.mock("@/env", () => ({
  getServerEnv: () => ({
    RESEND_API_KEY: "re_test",
    RESEND_SEGMENT_ID: "segment-1",
    EMAIL_FROM: "NortBrand <onboarding@resend.dev>",
  }),
}));

const { removeContact, upsertSegmentContact } = await import("./resend");

const ok = { data: { id: "c1" }, error: null };
const failure = (name: string) => ({
  data: null,
  error: { name, message: "quoted request", statusCode: 422 },
});
const properties = { locale: "en", unsubscribe_url: "https://u" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertSegmentContact", () => {
  it("creates the contact in the newsletter segment", async () => {
    contacts.create.mockResolvedValue(ok);
    expect(await upsertSegmentContact("ana@example.com", properties)).toEqual({
      ok: true,
    });
    expect(contacts.create).toHaveBeenCalledWith({
      email: "ana@example.com",
      unsubscribed: false,
      properties,
      segments: [{ id: "segment-1" }],
    });
    expect(contacts.update).not.toHaveBeenCalled();
  });

  it("updates an existing contact and adds it to the segment", async () => {
    contacts.create.mockResolvedValue(failure("validation_error"));
    contacts.update.mockResolvedValue(ok);
    contacts.segments.add.mockResolvedValue(ok);

    expect(await upsertSegmentContact("ana@example.com", properties)).toEqual({
      ok: true,
    });
    expect(contacts.update).toHaveBeenCalledWith({
      email: "ana@example.com",
      unsubscribed: false,
      properties,
    });
    expect(contacts.segments.add).toHaveBeenCalledWith({
      email: "ana@example.com",
      segmentId: "segment-1",
    });
  });

  it("returns only the error name, never the message", async () => {
    contacts.create.mockResolvedValue(failure("validation_error"));
    contacts.update.mockResolvedValue(failure("not_found"));
    expect(await upsertSegmentContact("ana@example.com", properties)).toEqual({
      ok: false,
      code: "not_found",
    });

    contacts.create.mockRejectedValue(new Error("network"));
    expect(await upsertSegmentContact("ana@example.com", properties)).toEqual({
      ok: false,
      code: "contact_threw",
    });
  });
});

describe("removeContact", () => {
  it("deletes the contact, and a missing one counts as removed", async () => {
    contacts.remove.mockResolvedValueOnce(ok);
    expect(await removeContact("ana@example.com")).toEqual({ ok: true });
    expect(contacts.remove).toHaveBeenCalledWith({ email: "ana@example.com" });

    contacts.remove.mockResolvedValueOnce(failure("not_found"));
    expect(await removeContact("ana@example.com")).toEqual({ ok: true });

    contacts.remove.mockResolvedValueOnce(failure("rate_limit_exceeded"));
    expect(await removeContact("ana@example.com")).toEqual({
      ok: false,
      code: "rate_limit_exceeded",
    });
  });
});
