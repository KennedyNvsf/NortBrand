import { describe, expect, it, vi } from "vitest";

import {
  deleteUpdate,
  editUpdate,
  postUpdate,
  type UpdateDeps,
} from "./updates-edit";

const VIEWER = {
  status: "signed_in",
  userId: "00000000-0000-4000-a000-000000000001",
  name: "Ana Costa",
  role: "member",
} as const;
const PROJECT = "00000000-0000-4000-b000-000000000001";
const UPDATE = "00000000-0000-4000-a000-0000000000e1";
const TICKET = "00000000-0000-4000-a000-0000000000d1";

function deps(overrides: Partial<UpdateDeps> = {}): UpdateDeps {
  return {
    viewer: () => Promise.resolve(VIEWER),
    notifyNeedsYou: vi.fn(() => Promise.resolve(2)),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

const post = {
  projectId: PROJECT,
  body: " We need the menu photos. ",
  highlight: false,
  needsClient: true,
  ticketIds: [TICKET, TICKET],
};

describe("postUpdate", () => {
  it("saves the post and emails the client straight away when it needs them", async () => {
    const d = deps();
    const save = vi.fn(() => Promise.resolve("update-1"));
    expect(await postUpdate(post, { ...d, save })).toEqual({
      status: "saved",
      notified: 2,
      notifyFailed: false,
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "We need the menu photos.",
        ticketIds: [TICKET],
      }),
    );
    expect(d.notifyNeedsYou).toHaveBeenCalledWith("We need the menu photos.");
  });

  it("leaves ordinary posts to the digest", async () => {
    const d = deps();
    await postUpdate(
      { ...post, needsClient: false },
      { ...d, save: () => Promise.resolve("u") },
    );
    expect(d.notifyNeedsYou).not.toHaveBeenCalled();
  });

  it("keeps the post when the email fails, and says so", async () => {
    const d = deps({ notifyNeedsYou: () => Promise.reject(new Error("down")) });
    expect(
      await postUpdate(post, { ...d, save: () => Promise.resolve("u") }),
    ).toEqual({
      status: "saved",
      notified: 0,
      notifyFailed: true,
    });
    expect(d.reportFailure).toHaveBeenCalledWith("notify_needs_you", undefined);
  });

  it("refuses an empty post and a ticket from another project", async () => {
    const save = vi.fn(() => Promise.resolve({ error: { code: "23503" } }));
    expect(
      await postUpdate({ ...post, body: "  " }, { ...deps(), save }),
    ).toEqual({
      status: "invalid",
      error: "bodyRequired",
    });
    expect(save).not.toHaveBeenCalled();
    expect(await postUpdate(post, { ...deps(), save })).toEqual({
      status: "invalid",
      error: "linkInvalid",
    });
  });
});

describe("editUpdate", () => {
  const edit = { ...post, updateId: UPDATE };

  it("emails only when the edit newly asks the client for something", async () => {
    const first = deps();
    await editUpdate(edit, {
      ...first,
      wasNeedsClient: () => Promise.resolve(false),
      save: () => Promise.resolve("ok" as const),
    });
    expect(first.notifyNeedsYou).toHaveBeenCalledTimes(1);

    const again = deps();
    await editUpdate(edit, {
      ...again,
      wasNeedsClient: () => Promise.resolve(true),
      save: () => Promise.resolve("ok" as const),
    });
    expect(again.notifyNeedsYou).not.toHaveBeenCalled();
  });

  it("treats a deleted or unknown post as not found", async () => {
    const save = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await editUpdate(edit, {
        ...deps(),
        wasNeedsClient: () => Promise.resolve(null),
        save,
      }),
    ).toEqual({ status: "not_found" });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("deleteUpdate", () => {
  it("removes the post under the teammate's session", async () => {
    const remove = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await deleteUpdate(
        { projectId: PROJECT, updateId: UPDATE },
        { ...deps(), remove },
      ),
    ).toEqual({ status: "saved", notified: 0, notifyFailed: false });
    expect(remove).toHaveBeenCalledWith({
      projectId: PROJECT,
      updateId: UPDATE,
    });
  });

  it("refuses signed-out callers", async () => {
    const remove = vi.fn(() => Promise.resolve("ok" as const));
    expect(
      await deleteUpdate(
        { projectId: PROJECT, updateId: UPDATE },
        {
          ...deps({ viewer: () => Promise.resolve({ status: "signed_out" }) }),
          remove,
        },
      ),
    ).toEqual({ status: "forbidden" });
    expect(remove).not.toHaveBeenCalled();
  });
});
