import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { request } from "@playwright/test";

import { promoDismissedOrigin } from "./promo-state";
import { PREVIEW_STATE_PATH, previewURL } from "./target";

/**
 * Global setup for a run against a Vercel preview (#45). Previews sit behind Vercel
 * Authentication; the Protection Bypass for Automation secret gets past it.
 *
 * The secret is sent once, here, with `x-vercel-set-bypass-cookie`, and Vercel answers
 * with a bypass cookie for the preview's host. Every test then carries that cookie (the
 * saved storage state), so the secret itself never travels with page requests. Sending
 * it as an `extraHTTPHeaders` header instead would also send it to every third-party
 * host a page loads (the Sanity CDN, Sentry).
 */
export default async function previewSetup() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!previewURL || !secret) {
    throw new Error(
      "E2E_BASE_URL and VERCEL_AUTOMATION_BYPASS_SECRET must both be set for a preview run.",
    );
  }

  const context = await request.newContext({
    baseURL: previewURL,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const response = await context.get("/en");
  if (response.status() !== 200) {
    throw new Error(
      `The preview answered ${String(response.status())} to /en with the bypass secret. Check VERCEL_AUTOMATION_BYPASS_SECRET.`,
    );
  }

  const state = await context.storageState();
  await context.dispose();
  const host = new URL(previewURL).hostname;
  if (!state.cookies.some((cookie) => cookie.domain.endsWith(host))) {
    throw new Error("Vercel set no bypass cookie for the preview host.");
  }

  // The same made choice as the local default (playwright.config.ts), so the banner
  // never covers what a spec clicks.
  state.cookies.push({
    name: "nb_consent",
    value: "v1.0",
    domain: host,
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  });

  state.origins.push(promoDismissedOrigin(previewURL));

  await mkdir(dirname(PREVIEW_STATE_PATH), { recursive: true });
  await writeFile(PREVIEW_STATE_PATH, JSON.stringify(state));
}
