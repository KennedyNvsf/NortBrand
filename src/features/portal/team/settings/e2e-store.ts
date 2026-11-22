import { DEFAULT_STAGE_TEMPLATE } from "../projects/templates";
import type { WorkspaceSettings } from "./rules";
import type { ValidSettings } from "./settings";

/**
 * A fake settings store for Playwright (#159), used only when isFakeBackendEnabled().
 * It starts from the seeded defaults (migration 20261124120000). The rules run for real
 * in SQL (pgTAP 16) and in settings.ts; here only the stale-save check is mirrored. One
 * store per server process, kept on globalThis because route handlers and page actions
 * load separate module copies.
 */

const holder = globalThis as typeof globalThis & {
  __nbFakeSettings?: WorkspaceSettings;
};

function seed(): WorkspaceSettings {
  return {
    updatedAt: "2026-11-22T10:00:00.000Z",
    codeMaxTries: 3,
    lockoutMinutes: 15,
    sessionDays: 30,
    dailyDigest: true,
    notifyFirstClientSignIn: true,
    allowedTeamDomain: null,
    stages: DEFAULT_STAGE_TEMPLATE.map((stage) => ({ ...stage })),
  };
}

export function fakeSettings(): WorkspaceSettings {
  holder.__nbFakeSettings ??= seed();
  return holder.__nbFakeSettings;
}

export function fakeSaveSettings(
  settings: ValidSettings,
): Promise<
  { updatedAt: string } | { error: { code: string; message?: string } }
> {
  const current = fakeSettings();
  if (settings.updatedAt !== current.updatedAt) {
    return Promise.resolve({
      error: { code: "PT409", message: "stale_settings" },
    });
  }
  // Strictly later than the last save, even within the same millisecond.
  const updatedAt = new Date(
    Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
  ).toISOString();
  holder.__nbFakeSettings = {
    updatedAt,
    codeMaxTries: settings.codeMaxTries,
    lockoutMinutes: settings.lockoutMinutes,
    sessionDays: settings.sessionDays,
    dailyDigest: settings.dailyDigest,
    notifyFirstClientSignIn: settings.notifyFirstClientSignIn,
    allowedTeamDomain: settings.allowedTeamDomain,
    stages: settings.stages.map((stage) => ({ ...stage })),
  };
  return Promise.resolve({ updatedAt });
}
