import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  parseBody: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next-sanity/webhook", () => ({ parseBody: mocks.parseBody }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/env", () => ({
  getServerEnv: () => ({ SANITY_REVALIDATE_SECRET: "s".repeat(40) }),
}));

const { POST } = await import("./route");
const request = {} as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/revalidate", () => {
  it("checks the signature with the secret before anything else", async () => {
    mocks.parseBody.mockResolvedValue({
      isValidSignature: false,
      body: { _type: "post" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.parseBody).toHaveBeenCalledWith(request, "s".repeat(40), true);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("treats a missing signature as invalid", async () => {
    mocks.parseBody.mockResolvedValue({
      isValidSignature: null,
      body: { _type: "post" },
    });
    expect((await POST(request)).status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("expires the blog tags at once for a signed blog change", async () => {
    mocks.parseBody.mockResolvedValue({
      isValidSignature: true,
      body: { _type: "post" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      revalidated: true,
      tags: ["blog-list", "blog-posts"],
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("blog-list", {
      expire: 0,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("blog-posts", {
      expire: 0,
    });
  });

  it("changes nothing for other document types or an empty body", async () => {
    mocks.parseBody.mockResolvedValue({
      isValidSignature: true,
      body: { _type: "sanity.imageAsset" },
    });
    expect(await (await POST(request)).json()).toEqual({
      revalidated: false,
      tags: [],
    });

    mocks.parseBody.mockResolvedValue({ isValidSignature: true, body: null });
    expect((await POST(request)).status).toBe(400);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
