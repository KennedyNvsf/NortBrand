"use client";

import { useSyncExternalStore } from "react";

import { consentCookie, readConsentCookie, type Consent } from "./consent";

/*
 * The consent state in the browser: a tiny external store over the cookie, read with
 * useSyncExternalStore (no state library, CLAUDE.md). Pages are static, so the server
 * never knows the choice: during prerender and hydration the state is "unknown", and
 * nothing consent-dependent renders until the browser has read the cookie.
 *
 * Consumers: the banner and preferences (this feature), the StickyCta (waits for a
 * choice) and, in #43, the GA4 loader (analytics only).
 */

export type ConsentState =
  | { status: "unknown" }
  | { status: "undecided" }
  | { status: "decided"; consent: Consent };

type Snapshot = {
  consent: ConsentState;
  preferencesOpen: boolean;
  /** A choice was saved during this visit (announced; not on later page loads). */
  savedThisVisit: boolean;
};

const SERVER_SNAPSHOT: Snapshot = {
  consent: { status: "unknown" },
  preferencesOpen: false,
  savedThisVisit: false,
};

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function readSnapshot(): Snapshot {
  const consent = readConsentCookie(document.cookie);
  return {
    consent: consent ? { status: "decided", consent } : { status: "undecided" },
    preferencesOpen: false,
    savedThisVisit: false,
  };
}

function update(next: Partial<Snapshot>) {
  snapshot = { ...(snapshot ?? readSnapshot()), ...next };
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  snapshot ??= readSnapshot();
  return snapshot;
}

/** Stores the visitor's choice and closes the preferences. */
export function saveConsent(consent: Consent) {
  document.cookie = consentCookie(
    consent,
    window.location.protocol === "https:",
  );
  update({
    consent: { status: "decided", consent },
    preferencesOpen: false,
    savedThisVisit: true,
  });
}

export function openConsentPreferences() {
  update({ preferencesOpen: true });
}

export function closeConsentPreferences() {
  update({ preferencesOpen: false });
}

function useConsentSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export function useConsent(): ConsentState {
  return useConsentSnapshot().consent;
}

export function useConsentPreferencesOpen(): boolean {
  return useConsentSnapshot().preferencesOpen;
}

export function useConsentSavedThisVisit(): boolean {
  return useConsentSnapshot().savedThisVisit;
}

/** Test seam: forget the cached snapshot so the next read sees document.cookie again. */
export function resetConsentStoreForTests() {
  snapshot = null;
}
