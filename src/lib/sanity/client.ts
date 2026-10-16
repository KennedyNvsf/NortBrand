import { createClient, type SanityClient } from "next-sanity";

import { getServerEnv, publicEnv } from "@/env";

import { apiVersion } from "../../../sanity/api-version";

let client: SanityClient | undefined;

/**
 * The app's Sanity client: server-only (it carries the read token; `getServerEnv()`
 * refuses to run in the browser), published documents only, no CDN. Caching is ours:
 * every query runs inside a `"use cache"` function tagged for the revalidation webhook
 * (src/features/blog/data.ts), so Sanity's CDN would only add a second, stale layer.
 */
export function getSanityClient(): SanityClient {
  client ??= createClient({
    projectId: publicEnv.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: publicEnv.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion,
    token: getServerEnv().SANITY_API_READ_TOKEN,
    useCdn: false,
    perspective: "published",
  });
  return client;
}
