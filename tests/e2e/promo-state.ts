import { promo } from "../../src/content/promo";
import { PROMO_STORAGE_KEY } from "../../src/features/promo/promo-storage";

/*
 * The Home promo (#126) opens 8 s after the cookie choice. Every spec starts with a
 * choice made (playwright.config.ts), so without this the modal would open in the
 * middle of any Home test that runs longer than 8 s. The default storage state marks
 * the current offer as dismissed; promo.spec.ts starts without it.
 */
export function promoDismissedOrigin(origin: string) {
  return {
    origin: new URL(origin).origin,
    localStorage: [{ name: PROMO_STORAGE_KEY, value: promo.id }],
  };
}
