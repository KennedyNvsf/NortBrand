/*
 * The promo's dismissal flag: one first-party localStorage entry holding the id of the
 * offer the visitor closed. It records a preference, not a profile, and never leaves the
 * browser (docs/guides/consent.md › Other storage).
 *
 * Storage can be missing or throw (private windows, blocked site data). Both functions
 * fail closed: if the flag can't be read, the offer counts as dismissed and stays
 * hidden, rather than reappearing on every page because it could never be stored.
 */

export const PROMO_STORAGE_KEY = "nb_promo_dismissed";

/** True when this offer was dismissed, or when storage can't be read. */
export function isPromoDismissed(promoId: string): boolean {
  try {
    return window.localStorage.getItem(PROMO_STORAGE_KEY) === promoId;
  } catch {
    return true;
  }
}

/** Remembers that this offer was dismissed. A failed write is ignored: nothing to undo. */
export function dismissPromo(promoId: string): void {
  try {
    window.localStorage.setItem(PROMO_STORAGE_KEY, promoId);
  } catch {
    // Storage unavailable: the offer still closes for this page view.
  }
}
