import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verify: vi.fn<(payload: string, headers: Headers) => unknown>(),
  unsubscribe:
    vi.fn<
      (link: {
        email: string;
        token: string;
      }) => Promise<{ status: "unsubscribed" | "invalid" | "failed" }>
    >(),
}));

vi.mock("@/lib/resend-webhook", () => ({ verifyResendWebhook: mocks.verify }));
vi.mock("@/features/newsletter/actions", () => ({
  unsubscribeNewsletter: mocks.unsubscribe,
}));
vi.mock("@/env", () => ({
  getServerEnv: () => ({ NEWSLETTER_TOKEN_SECRET: "n".repeat(32) }),
}));

const { POST } = await import("./route");

const body = JSON.stringify({
  type: "contact.updated",
  data: { email: "ana@example.com", unsubscribed: true },
});

function request(headers: Record<string, string> = {}) {
  return new Request("https://nortbrand.com/api/newsletter/resend-webhook", {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/newsletter/resend-webhook", () => {
  it("checks the raw body and headers before anything else, and refuses a bad signature", async () => {
    mocks.verify.mockReturnValue(null);
    const response = await POST(request({ "svix-id": "msg_1" }));

    expect(response.status).toBe(401);
    const [payload, headers] = mocks.verify.mock.calls[0] ?? [];
    expect(payload).toBe(body);
    expect(headers).toBeInstanceOf(Headers);
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes a signed contact.updated and never echoes the address", async () => {
    mocks.verify.mockReturnValue(JSON.parse(body));
    mocks.unsubscribe.mockResolvedValue({ status: "unsubscribed" });
    const response = await POST(request());

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ result: "unsubscribed" });
    expect(text).not.toContain("ana@");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.unsubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@example.com" }),
    );
  });

  it("answers 500 when the unsubscribe failed, so Resend retries", async () => {
    mocks.verify.mockReturnValue(JSON.parse(body));
    mocks.unsubscribe.mockResolvedValue({ status: "failed" });
    expect((await POST(request())).status).toBe(500);
  });

  it("acknowledges other events with 200 and touches nothing", async () => {
    mocks.verify.mockReturnValue({ type: "email.delivered", data: {} });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "ignored" });
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("acknowledges an address our schema rejects with 200 (a retry cannot fix it)", async () => {
    mocks.verify.mockReturnValue(JSON.parse(body));
    mocks.unsubscribe.mockResolvedValue({ status: "invalid" });
    expect((await POST(request())).status).toBe(200);
  });
});
