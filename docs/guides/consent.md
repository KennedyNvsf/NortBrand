# Cookie consent

The cookie banner, the preferences panel and the stored choice (#42, ADR-007). GA4
loads from this choice in #43.

## 1. What we built

- **A first-party cookie.** `nb_consent` holds `v1.1` (analytics accepted) or `v1.0`
  (rejected) for 182 days. Essential cookies are always on; analytics is opt-in.
- **The cookie banner.** It appears on every page, the 404 included, until a choice is
  made. Reject and Accept have equal weight.
- **The preferences panel.** A centred dialog from tablet up, a bottom sheet on mobile. It
  has an Essential switch (locked on) and an Analytics switch.
- **A "Cookie settings" button** in the footer's legal links, which reopens the panel.
- **The Sticky CTA** now waits until a choice is made.
- **A `Switch` primitive** (Figma Toggle 325:26) in `src/components/ui/`.

## 2. How it works at runtime

```text
static HTML (server knows nothing)  →  consent "unknown": no banner, no sticky CTA
hydration: consent-store reads document.cookie
   no valid cookie → "undecided" → banner rises after 800 ms, live region announces it
   valid cookie    → "decided"   → nothing shown; StickyCta may appear
Accept / Reject / Save → saveConsent() → document.cookie = nb_consent=v1.x; Max-Age=182 days
   → store notifies subscribers → banner exits, panel closes, "choice saved" announced
Footer "Cookie settings" / banner "Manage preferences" → openConsentPreferences()
```

The pages are prerendered, so the server never reads the cookie. Everything that depends
on consent renders in the browser after hydration. That means no wrong banner flashes for
someone who already chose.

## 3. Files, one by one

**`src/features/consent/consent.ts`.** The pure part:

- the `Consent` type;
- the cookie name, version and lifetime;
- `serializeConsent` / `parseConsent` (`v<version>.<0|1>`);
- `readConsentCookie`, which finds the cookie in `document.cookie`;
- `consentCookie`, which builds `Path=/; SameSite=Lax`, plus `Secure` on https.

A value with another version reads as "not decided". Bumping `CONSENT_VERSION` therefore
asks everyone again, for example when a new category is added.

**`consent-store.ts`.** A small external store read with `useSyncExternalStore`. There is
no state library (CLAUDE.md). The snapshot holds three things:

- the consent state: `unknown` (server and hydration), `undecided` or `decided`;
- whether the panel is open;
- whether a choice was saved during this visit, so returning visitors don't hear "saved"
  on every page.

`saveConsent`, `openConsentPreferences` and `closeConsentPreferences` are the only
writers. Any client component can call `useConsent()`; #43 uses it to load GA4.

**`components/consent-manager.tsx`.** Mounted once in `[locale]/layout.tsx`, inside the
Motion and intl providers. The Studio is outside it. It renders three things:

- a polite live region, which announces the banner since the banner never takes focus;
- the banner, inside `AnimatePresence` so it can play its exit;
- the preferences.

**`components/cookie-banner.tsx`.** Figma 328:513, desktop 326:16, tablet 382:268 and
mobile 382:131.

- **Position.** From tablet up it floats bottom left, 520 wide. On mobile it spans the
  width, 12 px above the safe area.
- **Not modal.** No scrim, no focus trap, no `inert`: the Handoff says it "never blocks
  content or focus".
- **Buttons.** Reject (secondary) and Accept (primary) are the same size: two equal grid
  columns from tablet, stacked full width on mobile. `flex-1` let the longer "Reject
  non-essential" label widen its button by 2 px, which an e2e test caught.
- **Links.** "Manage preferences" is a button styled as the Figma Link; Privacy Policy is
  a `TextLink`.
- **Motion** (Motion Spec › Cookie banner, `consentBannerSpec` in `src/lib/motion.ts`):
  it rises 24 px after an 800 ms delay (350 ms, emphasized) and exits down 16 px
  (200 ms, exit curve). With reduced motion it is an opacity fade of 150 ms, with no
  delay.

**`components/consent-preferences.tsx`.** Figma 326:132, tablet 382:326 and mobile
382:193. It uses the same Dialog-on-md / Drawer-on-mobile split as the Services details,
which gives it a focus trap, Esc and the close button.

- **Closing without saving.** It changes nothing; if no choice exists yet, the banner is
  still there.
- **Starting state.** The body remounts on each opening, so the Analytics switch starts
  from the saved choice.
- **Equal weight.** "Reject all" and "Save preferences" have equal weight.

**`components/cookie-settings-button.tsx`.** A client button for the server-rendered
footer, styled like Privacy and Terms. The footer's legal row now wraps, so three items
fit at 390 px.

**`src/components/ui/switch.tsx`.** Radix Switch styled to the Figma Toggle:

- **Off.** White track, a 1.5 px muted border and a 14 px muted knob.
- **On.** Primary track and a 20 px white knob.
- **Locked.** On at 45% opacity and disabled.
- **Motion.** The knob moves on the snappy spring, scaling from 0.7 to 1 (transform
  only), while the track's colours cross-fade. With reduced motion the knob doesn't
  travel.
- **Hit area.** Grows to 44 px for touch.

**`src/components/site/sticky-cta.tsx`.** The bar is visible only when the hero has left
the screen, no blocker is in view, and consent is `decided`. The footer's legal row is now
a blocker too (`data-sticky-cta-hide`). Without it, the bar sat over Privacy, Terms and
Cookie settings at the end of a page on mobile, and taps landed on the bar. e2e found
this.

## 4. Decisions and trade-offs

- **No Consent Mode, no third-party CMP.** ADR-007 rules out any request to Google before
  a choice. A small first-party component is enough for two categories.
- **The cookie, not localStorage.** ADR-007 asks for a cookie. It also means the choice
  could be read on the server later, if that is ever needed.
- **Value without a timestamp.** The browser enforces the 6 months through `Max-Age`. The
  value records nothing personal.
- **"Cookie settings" in the footer is not in Figma.** It is required by ADR-007 and the
  ticket, and logged in tech debt for design.

## 5. Tests

| File                                      | Covers                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `features/consent/consent.test.ts`        | Value round trip, versioning, junk, cookie lookup, Max-Age and attributes                                                                                                                                          |
| `features/consent/consent-store.test.tsx` | Undecided → decided, earlier choice, opening and closing the panel                                                                                                                                                 |
| `components/site/sticky-cta.test.tsx`     | Waits for a choice; the earlier hero and blocker rules                                                                                                                                                             |
| `tests/e2e/consent.spec.ts`               | Banner on first visit and the 404, not blocking, axe, equal buttons, Reject (182 days, not asked again), keyboard Accept, preferences (axe, locked essential, save, Esc), footer reopen, sticky CTA after a choice |

Every other Playwright spec starts with a choice already made (`storageState` in
`playwright.config.ts`), so the banner never covers what it clicks.

## 6. Day-to-day

- **Read the choice** in a client component with `useConsent()`. Never read the cookie
  directly.
- **Add a category** by adding it to `Consent`, the panel and the copy, then bump
  `CONSENT_VERSION`.
- **Cookie text in the Privacy Policy** (`Legal.privacy.sections.cookies`) names
  `nb_consent`, `_ga` and the `_ga_` property cookie. It is still draft text awaiting
  legal review.
