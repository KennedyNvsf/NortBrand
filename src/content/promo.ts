/**
 * The limited offer shown by the promo (Figma 02 Components › Promo Modal 510:732 and
 * Promo Card 510:794, #126/#127). Typed content, like services and FAQ: the copy lives
 * in messages under `Promo`, and this file holds what the code decides with.
 *
 * The copy repeats the offer and the end date ("free wireframe", "31 December"). Change
 * both here and in messages/en.json when the offer changes, give it a new `id`, and
 * mark the PT keys for the translator (docs/guides/localization.md § 6).
 */

/** Where an offer can appear: the Home modal, or the corner card on About and Services. */
export type PromoPlacement = "home" | "about" | "services";

export type Promo = {
  /** Stored in the dismissal flag, so a new offer shows again to visitors who closed this one. */
  id: string;
  /** Last moment the offer is shown, as an ISO instant. */
  endsAt: string;
  /** How long after the cookie choice the offer appears, in ms. */
  delayMs: number;
};

export const promo = {
  // A new id per offer: visitors who closed the 20% offer (`first-project-2026`) see
  // this one once (#77).
  id: "free-wireframe-2026",
  // 31 December, 23:59:59 in Lisbon. Lisbon is on UTC (WET) in December.
  endsAt: "2026-12-31T23:59:59Z",
  delayMs: 8000,
} as const satisfies Promo;

/**
 * Whether the offer can still be shown at `now`. Pages are static, so this runs in the
 * browser at view time: the offer disappears on the end date without a deploy.
 */
export function isPromoActive(now: Date, offer: Promo = promo): boolean {
  return now.getTime() <= Date.parse(offer.endsAt);
}
