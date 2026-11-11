# Navigation: SiteNav, menu and language switcher

**Covers:** #6. **Design source:** Figma 02 Components › Navigation (`337:98`), menu
overlays (`343:92`, `343:126`), Handoff › Nav and Behavior.

## 1. What we built

One header for every page and every screen size:

```
Mobile  < 768    [logo]                                   (≡)
Tablet  768+     [logo]               [Book a Consultation →] (≡)
Desktop 1024+    [logo]   Services About Blog Contact   EN · PT [Book a Consultation →]
```

It sticks to the top. A hairline appears under it after 8 px of scroll. The current
page's link is green. On tablet and mobile, (≡) opens a full-screen menu with the
links, the language switcher, the Book button and the contact email.

## 2. Server and client: who does what

The most important design decision is **what runs in the browser**. A nav is mostly
static: logo, links and a button. Only four things need JavaScript:

```
SiteNav (server)                      ← layout, logo, Book buttons: no JS
 └─ SiteHeader (client)               ← needs scroll position
     ├─ NavLinks (client)             ← needs the current route for "active"
     ├─ LocaleSwitcher (client)       ← needs the current route to link to it
     └─ MobileMenu (client)           ← needs open/closed state
```

`SiteHeader` receives the rest of the nav as `children`. In the App Router, children
passed from a server component into a client component **stay server-rendered**: the
client component only wraps them. That is how we get a sticky, scroll-aware header
without turning the whole nav into client code.

## 3. The files

### `src/content/navigation.ts`: the data

```ts
export const navItems = [
  { key: "services", href: "/services" }, …
];
export function isActiveRoute(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

- One list feeds both the desktop links and the menu, so they can't drift apart.
- `key` is also the message key (`Nav.services`), so labels are translated.
- `isActiveRoute` is a pure function, so it's unit-tested without a browser. The
  `startsWith(href + "/")` keeps Blog active on `/blog/some-post`, and the `/` stops
  `/blogroll` from matching `/blog`.
- `overlayNavRoutes` lists pages whose hero photo sits under a transparent nav (Services).

### `site-nav.tsx` (server): the layout

On desktop it's a three-column grid, `grid-cols-[1fr_auto_1fr]`: the links sit in the
`auto` middle column, so they're centred on the page whatever the logo and button widths
are. Below 1024 it's a simple flex row. Breakpoint differences are just responsive
classes (`hidden md:inline-flex`, `lg:hidden`), as the Handoff asks: one component, not
three.

The nav spans the full 1440 canvas with the page gutter, wider than the 1136 content
column, exactly as in Figma.

### `site-header.tsx` (client): sticky and hairline

```ts
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const update = () => setScrolled(window.scrollY > 8);
  window.addEventListener("scroll", update, { passive: true });
  …
}, []);
```

- `{ passive: true }` tells the browser we will never block scrolling, so it can keep
  scrolling smooth.
- The hairline is always there but transparent; when scrolled its colour becomes the
  border token. Only the colour transitions (150 ms), so nothing moves or reflows.
- **Overlay tone:** on `/services` the header is `fixed` over the photo, transparent,
  with white content. Once scrolled it turns solid. It sets `data-tone="overlay"` on
  the `<header>`, and children style themselves with Tailwind's named group:
  `group-data-[tone=overlay]/header:text-text-on-accent`. The logo follows for free
  because its wordmark is `currentColor`.

### `nav-links.tsx` (client): active link

`usePathname()` from `@/i18n/navigation` returns the path **without** the locale
(`/services`, not `/en/services`), so the same check works in both languages and during
static rendering. The active link gets:

- `aria-current="page"`, so screen readers announce "current page". The state is never
  colour alone.
- green text (`action-secondary`) on light backgrounds; white + underline over the photo.

### `locale-switcher.tsx` (client): EN · PT

Not designed in Figma; placement agreed with the developer (desktop nav + menu).

- Each option is a `Link` to **the same page** (`href={pathname}`) with `locale="pt"`.
  next-intl also writes the `NEXT_LOCALE` cookie, so the next visit to `/` lands in that
  language (see the localization guide).
- Visible text is `EN` / `PT`; a screen-reader-only suffix adds the language name, in
  that language: "PT – Português". WCAG 2.5.3 asks that the accessible name _contains_
  the visible label, so voice users can say "click PT".
- The names live in `localeNames` (`src/i18n/routing.ts`), **not** in messages. A
  language is always named in itself; translating "Português" on the English site would
  hide it from the people looking for it.
- The current option is bold and `aria-current="true"`.

### `mobile-menu.tsx` and `mobile-menu-panel.tsx` (client): the full-screen menu

`mobile-menu.tsx` is only the (≡) button. The menu itself, in `mobile-menu-panel.tsx`,
loads in its own chunk (#105, [Performance](./performance.md)):

- prefetched when the browser is idle, or when the button is hovered or focused;
- mounted the first time the menu opens, then kept mounted so it can animate closed.

The button carries `aria-haspopup="dialog"`, `aria-expanded` and, while open,
`aria-controls`, as a Radix trigger would.

The panel is built on the shadcn `Sheet` (Radix Dialog). Radix gives us, for free:

- **focus trap**: Tab cycles inside the menu, never behind it
- **scroll lock**: the page behind doesn't scroll
- **Esc to close**. Focus returns to the (≡) button through `onCloseAutoFocus`,
  because the button isn't a Radix trigger any more.

Details:

- Every link is wrapped in `SheetClose asChild`, so tapping a link closes the menu _and_
  navigates. Without it, the menu would still be open on the next page.
- The menu needs an accessible title for screen readers: a visually hidden
  `SheetTitle` ("Menu").
- The menu is controlled (`open` / `setOpen`) so the language switcher can close it.
- Animation is the existing tw-animate fade and slide. The staggered links from the
  Motion Spec come in the dedicated Motion ticket.

## 4. Type and tokens

Figma's nav links are Medium 15 px, which wasn't one of our type roles. Rather than
`text-[15px]` at the call site, `globals.css` gained a `text-nav` role with its Figma
source. The menu links reuse `text-h1` (36 mobile / 40 tablet, bold), which matches
Figma.

## 5. How the tests protect this

| What could go wrong                               | Test                             |
| ------------------------------------------------- | -------------------------------- |
| Wrong item marked active, `/blogroll` vs `/blog`  | `content/navigation.test.ts`     |
| Hairline missing, or header scrolls away          | `e2e/nav.spec.ts`                |
| Switcher changes page or forgets the language     | `e2e/nav.spec.ts` (cookie check) |
| Menu leaks focus, ignores Esc, loses focus return | `e2e/nav.spec.ts` (mobile)       |
| Menu stays open after navigating                  | `e2e/nav.spec.ts` (mobile)       |
| Contrast, names, landmarks; overflow at 390       | page harness (axe), both locales |

**Running e2e while `pnpm dev` is running:** the suite starts its own production server.
If port 3000 is taken by your dev server, Playwright would reuse it, and a dev server
compiles on demand and hydrates slowly, which makes menu tests flaky. Use another port:

```
E2E_PORT=3100 pnpm test:e2e
```

## 6. Day-to-day rules

1. **New top-level page?** Add it to `navItems` and a `Nav.<key>` message; it shows up in
   both the desktop links and the menu.
2. **New page with a photo hero under the nav?** Add it to `overlayNavRoutes`.
3. **Links inside the menu** must use `SheetClose asChild`.
4. **Never import `Link` from `next/link`** in nav code; use `@/i18n/navigation`.
