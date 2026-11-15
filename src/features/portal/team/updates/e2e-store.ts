import { E2E_PROJECT_VIEW } from "../../overview/e2e-fixture";
import { fakeTicketId } from "../board/e2e-store";

/**
 * The fake backend's project updates for Playwright (#139), used only when
 * isFakeBackendEnabled(). Seeded from the client portal's fixture (NB-1234); posts from
 * the timeline (#138) and the Post update modal land here too, so every team page shows
 * one feed. One store per server process.
 */

export type FakeUpdate = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  highlight: boolean;
  needsClient: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  ticketIds: string[];
};

const updates: FakeUpdate[] = E2E_PROJECT_VIEW.updates.map((update) => ({
  id: crypto.randomUUID(),
  body: update.body,
  authorName: update.authorName,
  createdAt: update.createdAt,
  highlight: update.highlight,
  needsClient: update.needsClient,
  editedAt: update.editedAt,
  deletedAt: null,
  ticketIds: update.ticketIds.map(fakeTicketId),
}));

/** Live posts, newest first. */
export function fakeLiveUpdates(): FakeUpdate[] {
  return updates
    .filter((update) => update.deletedAt === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function fakePostUpdate(input: {
  body: string;
  authorName: string;
  highlight: boolean;
  needsClient: boolean;
  ticketIds: string[];
}): string {
  const id = crypto.randomUUID();
  updates.push({
    id,
    body: input.body.trim(),
    authorName: input.authorName,
    createdAt: new Date().toISOString(),
    highlight: input.highlight,
    needsClient: input.needsClient,
    editedAt: null,
    deletedAt: null,
    ticketIds: input.ticketIds,
  });
  return id;
}

export function fakeFindUpdate(id: string): FakeUpdate | null {
  return (
    updates.find((update) => update.id === id && update.deletedAt === null) ??
    null
  );
}

export function fakeEditUpdate(
  id: string,
  input: {
    body: string;
    highlight: boolean;
    needsClient: boolean;
    ticketIds: string[];
  },
): "ok" | "not_found" {
  const update = fakeFindUpdate(id);
  if (!update) return "not_found";
  Object.assign(update, {
    ...input,
    body: input.body.trim(),
    editedAt: new Date().toISOString(),
  });
  return "ok";
}

export function fakeDeleteUpdate(id: string): "ok" | "not_found" {
  const update = fakeFindUpdate(id);
  if (!update) return "not_found";
  update.deletedAt = new Date().toISOString();
  return "ok";
}
