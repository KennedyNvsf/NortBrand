# Limited offer (promo)

The "20% off your first project" offer, shown once per visitor until 31 December 2026.
Home gets a modal (#126); About and Services get a corner card (#127). Figma: 02
Components › Promo Modal (`510:732`) and Promo Card (`510:794`). Motion: 10 — Motion Spec ›
PROMO (`550:2`).

## 1. What we built

- **Home modal (#126).** From 768 px up, a centred two-panel Dialog: a dark offer panel
  ("Ends 31 Dec", "20%", "Off your first project", the logomark watermark) and the
  content (eyebrow, headline with the red keyword, body, terms, "Book a Consultation" and
  "Not now"). Below 768 px, a bottom sheet with the offer as a dark band.
- **When it shows.** 8 s after the cookie choice, once per visitor, never after the end
  date, and never on top of another dialog. These are the lead's decisions of 2026-11-12.
- **What it records.** Three GA4 events, only with analytics consent: `promo_view`,
  `promo_click` and `promo_dismiss`, each with `placement` (`home`, `about` or
  `services`). There is no database change. A consultation request does not say it came
  from the offer; the team asks on the call (lead's decision).

## 2. How it works at runtime

```
Home (static HTML, no promo markup)
  └ HomePromo (server)      translates messages › Promo, passes copy as props
      └ PromoLauncher (client, renders nothing yet)
          ├ idle: prefetch the dialog chunk, only if the offer is live and not dismissed
          ├ usePromoTrigger:
          │   cookie choice made?  →  offer live?  →  not dismissed?  →  wait 8 s
          │   → <body data-scroll-locked>? wait for it to clear  →  due = true
          ├ due → trackEvent("promo_view") and mount PromoDialog (own chunk)
          └ any close → localStorage nb_promo_dismissed = offer id
                        + promo_dismiss, or promo_click for "Book a Consultation"
```

1. The page is static. The server can't know the visitor's cookie choice, dismissal or
   the current date, so everything that decides visibility runs in the browser after
   hydration. Before that, the launcher renders `null`: no markup, no layout shift.
2. `usePromoTrigger` starts its 8 s timer only once `useConsent()` is `decided`. A
   returning visitor gets 8 s after load. A first-time visitor gets 8 s after pressing
   Accept or Reject, so the promo never lands on the banner.
3. When the timer fires and a dialog is already open (the mobile menu, cookie settings,
   a service's details), Radix has set `data-scroll-locked` on `<body>`. A
   MutationObserver waits for it to clear, so two dialogs never stack.
4. The dialog loads with `next/dynamic` (Radix Dialog or vaul, about 20 KiB). It is
   prefetched when the browser is idle, so it opens without a network wait.
5. Closing in any way (Esc, backdrop, Close, "Not now", swipe down, or "Book a
   Consultation") stores the offer's id. The launcher keeps the dialog mounted after
   closing so its exit animation plays.

## 3. Files, one by one

| File                                               | What and why                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/promo.ts`                             | The offer as typed content: `id`, `endsAt` (31 Dec 23:59:59 Lisbon, which is UTC in December) and `delayMs`. `isPromoActive(now)` is pure, so it is unit-tested with fixed dates. The copy lives in messages and repeats the date and the discount: change both together.                                                         |
| `src/features/promo/promo-storage.ts`              | `isPromoDismissed` and `dismissPromo` over one localStorage key, `nb_promo_dismissed`, holding the offer id. It **fails closed**: if storage throws (private mode, blocked site data), the offer counts as dismissed. Otherwise a visitor whose storage is blocked would see it on every page.                                    |
| `src/features/promo/use-promo-trigger.ts`          | The rules in § 2, steps 2–3. It returns `true` once. It doesn't own `open`; the launcher does.                                                                                                                                                                                                                                    |
| `src/features/promo/components/home-promo.tsx`     | Server shell. It translates `Promo` (plus `Common.bookConsultation`, so the button reads the same as every other booking button) and passes the strings down. The `Promo` namespace therefore stays out of `CLIENT_MESSAGE_PATHS`, and only Home's HTML carries it.                                                               |
| `src/features/promo/components/promo-launcher.tsx` | Client. Prefetch, trigger, analytics and dismissal. `open` is derived (`due && !closed`), so no state is set inside an effect.                                                                                                                                                                                                    |
| `src/features/promo/components/promo-dialog.tsx`   | The UI. `useMediaQuery(MEDIA_MD)` picks Dialog or Drawer, like the Services details: one `open` state, so a resize swaps the container instead of closing it. `OfferPanel` reuses the logomark path from `mark-panel.tsx` (Figma's watermark is the same mark). On open, focus goes to the dialog container, not Close (see § 4). |
| `src/features/promo/components/promo-copy.ts`      | The `PromoCopy` prop type.                                                                                                                                                                                                                                                                                                        |
| `src/components/ui/dialog.tsx`, `drawer.tsx`       | `DialogContent` and `DrawerContent` accept `overlayProps`, so one dialog can give its backdrop its own timing without changing every other dialog.                                                                                                                                                                                |
| `src/app/globals.css`                              | The `--duration-base-exit` token (190 ms, 75% of base) and the promo motion rules under `data-motion="promo"` (§ 4).                                                                                                                                                                                                              |
| `src/lib/analytics.ts`                             | The three `promo_*` events in `AnalyticsEvents`.                                                                                                                                                                                                                                                                                  |
| `tests/e2e/promo-state.ts`, `playwright.config.ts` | Every spec starts with the offer dismissed, otherwise the modal would open in the middle of Home tests that run longer than 8 s. `promo.spec.ts` starts without it.                                                                                                                                                               |

## 4. Decisions and trade-offs

- **Motion (Motion Spec › PROMO, following Emil Kowalski).**
  - **Modal:** a centred scale-and-fade from 0.95, never from 0. The shared dialog also
    rises 12 px; the promo doesn't, because it appears on its own rather than from a
    trigger. In 250 ms on the emphasized curve, out 190 ms on the exit curve. The scale
    is set through tw-animate's variables in an unlayered rule, which beats the shared
    `zoom-in-97`; the global reduced-motion rule (`!important`) still zeroes it.
  - **Sheet:** vaul's slide up at 350 ms (vaul's curve, a critically damped spring) and
    250 ms out. Vaul injects its CSS at runtime, so our selectors carry one more
    attribute than its own.
  - **Reduced motion:** opacity only, at most 150 ms. The modal is covered by the global
    rule; the sheet's slide is a keyframe, so it is swapped for `promo-fade-in` /
    `promo-fade-out`.
  - **No stagger and no drawing.** The services dialog staggers its content; the promo
    doesn't, because an unrequested dialog should settle at once. The watermark is
    static.
- **Focus on open.** Radix focuses the first control by default, which shows Close with a
  red ring as the dialog appears, as if it were the suggested action. The visitor didn't
  open this dialog, so the container takes focus instead. Screen readers still announce
  the title and description, and the trap is unchanged.
- **localStorage, not a cookie.** The flag never needs to reach the server, and a cookie
  would travel with every request. It holds a content id, not a profile, so it is
  functional storage, outside the consent categories (consent guide § 4).
- **Fail closed** when storage is unavailable (see the table above).
- **No promo markup on the server.** Rendering it hidden would put a dialog in every
  visitor's DOM and in the accessibility tree. The launcher renders nothing until due.

## 5. Tests

| File                                            | Covers                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/promo.test.ts`                     | Live before and on the last second of 31 Dec (Lisbon), off from 1 Jan, valid config                                                                                                                                                                                                                   |
| `src/features/promo/promo-storage.test.ts`      | First visit, remembered dismissal, a new offer id shows again, fails closed on read errors, ignores write errors                                                                                                                                                                                      |
| `src/features/promo/use-promo-trigger.test.tsx` | Waits for the choice and exactly 8 s; never for a dismissed or ended offer; waits for an open dialog to close                                                                                                                                                                                         |
| `tests/e2e/promo.spec.ts`                       | Not before 7 s, opens after; Dialog on desktop, sheet on mobile; Contact link; focus stays inside on Tab; Esc closes and it stays dismissed after a reload; "Not now"; Book goes to Contact and dismisses; never after the end date; axe in PT; no overflow at 390 in PT; waits for the cookie choice |

The e2e spec uses `page.clock`, **paused** at a date inside the offer: page load doesn't
eat into the 8 s, and the spec doesn't depend on today's date. Because the timer starts
only after hydration, which the page doesn't signal, the spec advances the clock 1 s at a
time until the dialog opens (12 s cap). It resumes the clock before axe, because
`settleAnimations` waits for animation frames.

## 6. Day-to-day

- **A new offer:** change `id` (so everyone sees it, including visitors who closed the old
  one), `endsAt` and the `Promo` copy in EN, and send the PT keys to the translator.
- **Turn it off early:** set `endsAt` to a past instant. The code can stay.
- **A new placement:** add it to `PromoPlacement`; the events take it automatically.
- **Never** mount the launcher in the layout. It belongs to the pages that show the offer
  (performance guide: widgets go in the layout only if every page uses them).

## 7. The corner card on About and Services (#127)

**What.** The non-blocking version of the offer (Figma 02 Components › Promo Card
`510:794`: desktop `510:791`, 380 px; tablet `510:792`, 360 px; mobile `510:793`). It
has the eyebrow, the headline with the red keyword, one line, a full-width "Book a
Consultation" and a round Close. Bottom-right from 768 px up. On mobile it sits in the
Sticky CTA's slot (12 px above the safe area) and the Sticky CTA steps aside while it's
there. It shows on About and Services only.

**Same rules as the modal.** It uses the same `usePromoTrigger` (8 s after the cookie
choice, once per visitor, never after the end date, never over an open dialog) and the
same `nb_promo_dismissed` flag. Closing the card hides the Home modal too, and the other
way round. It also sends the same `promo_*` events, with `placement` `about` or
`services`.

**The copy.** The headline is the modal's (`Promo.title`). The line is the offer's
terms (`Promo.terms`) instead of Figma's shorter sentence: the lead decided on
2026-11-22 to reuse already translated copy rather than add a string, because an
untranslated string fails the production build. Figma's line is "Book a free
consultation before 31 December. New projects only."; the terms read "Offer ends 31
December 2026. New projects only."

### Runtime

```
About / Services (static HTML, no promo markup)
  └ CornerPromo (server)        translates Promo + Common, per page (never the layout)
      └ PromoCardLauncher (client, renders nothing yet)
          ├ usePromoTrigger → due  →  trackEvent("promo_view", { placement })
          ├ due → <body data-promo-card>  →  the Sticky CTA fades out, then hides
          ├ mount PromoCard (own small chunk)  →  rises from its corner
          ├ Close / Book → dismissPromo + promo_dismiss / promo_click → data-state=closed
          └ exit animation ends (or 400 ms fallback) → unmount → body attribute removed
                                                     → the Sticky CTA comes back
```

- **Non-blocking.** It is an `aside` labelled by its headline (a complementary
  landmark), not a dialog. It never moves focus, never locks scroll and never takes a
  backdrop. Its controls sit at the end of the page's tab order, after the CTA band,
  where it's mounted.
- **The Sticky CTA hand-off** is CSS (`globals.css`). While `<body data-promo-card>` is
  set, the bar fades out and then becomes `visibility: hidden`, so it leaves the tab
  order and the accessibility tree. The attribute is removed only after the card has
  finished leaving, so the bar comes back after the card and never on top of it. On
  mobile the card's entrance waits `--duration-base` (the bar's exit) before it rises.
- **Motion** (Motion Spec › PROMO, "Promo card"): it rises from bottom right, with
  opacity 0→1, y 16→0 and scale 0.96→1, in 300 ms `--ease-emphasized` (ease-out quint).
  It exits down 8 px to scale 0.98 in 225 ms `--ease-exit`. With reduced motion the
  keyframes swap for the opacity-only `promo-fade-in` / `promo-fade-out`, and the
  global rule caps them at 150 ms.

### Files

| File                                                    | What and why                                                                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/promo/components/corner-promo.tsx`        | Server shell, placed at the end of About's and Services' `<main>`. Passes the five strings the card needs as props, so `Promo` stays out of the client bundle.                             |
| `src/features/promo/components/promo-card-launcher.tsx` | Client. Trigger, analytics, dismissal, the body attribute and the exit phase. `phase` is derived from `due` (no state set inside an effect); a 400 ms timer unmounts if no animation runs. |
| `src/features/promo/components/promo-card.tsx`          | The UI, loaded with `next/dynamic` when due. The close button grows to a 44 px hit area on touch (`touch-target`).                                                                         |
| `src/app/globals.css`                                   | The card's keyframes under `data-motion="promo-card"` and the Sticky CTA rule.                                                                                                             |

### Tests

`promo.spec.ts` › "promo corner card" (both projects):

- it shows 8 s after load on About and Services, with the terms and a link to Contact,
  no dialog, focus left on the page and no scroll lock;
- Close dismisses it, and the Home modal then stays closed;
- Book goes to Contact and dismisses it;
- it never shows after the end date;
- at 390 it takes the Sticky CTA's slot (never both visible) and gives it back;
- axe passes while it's open, in EN and PT;
- there's no overflow at 390 in PT.

The pages stay static (○ in the build).
