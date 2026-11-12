# Developer guides

Living, topic-based explanations of how the code works, written for a developer joining
the project. Each ticket's walkthrough lands here (see the workflow rules in
`CLAUDE.md`). When a ticket changes a topic, update its guide in the same pull request so
the guides always match the code.

| Guide                                               | Covers                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Localization](./localization.md)                   | EN/PT routing, messages, hreflang, pseudo-localization, release guard, translation changes                                                        |
| [Components](./components.md)                       | Logo, Badge, FieldError, Select, icons, TextLink, ServiceCard, ArticleCard                                                                        |
| [Navigation](./navigation.md)                       | SiteNav, sticky header, active links, mobile menu, language switcher                                                                              |
| [Page layout](./layout.md)                          | The (site) route group, SiteFooter, services and legal links, cached year                                                                         |
| [Calls to action](./calls-to-action.md)             | CtaBand (rich headline, photo, scrim), StickyCta (IntersectionObserver, inert)                                                                    |
| [Home page](./home-page.md)                         | Home sections, FeatureSplit, SectionHeader, highlight tags, process steps, sticky CTA scope                                                       |
| [About page](./about-page.md)                       | Hero, story list, indented principle headline, `text-intro`, `emphasisTags`                                                                       |
| [Contact page](./contact-page.md)                   | Contact details from site.ts, the form card shell, steps, FAQ accordion, `LogoMark`, `indentTag`                                                  |
| [Legal pages](./legal-pages.md)                     | Privacy and Terms layout, typed legal content, `TableOfContents`, draft release guard                                                             |
| [System states](./system-states.md)                 | The localized 404 (catch-all, `ensureStatic`), loading splash, `LogoMark` drawing                                                                 |
| [SEO](./seo.md)                                     | Page metadata, share image, sitemap, robots, JSON-LD, preview noindex                                                                             |
| [Motion](./motion.md)                               | Motion Spec: tokens, `MotionProvider`, `<Reveal>`, journey line, Services grid, menu stagger                                                      |
| [Images and media](./images.md)                     | Register of every photo and video (source, licence, credit, notes), exporting, naming, crops, `sizes`, alt text                                   |
| [Services page](./services-page.md)                 | Photo hero, services card grid (stretched trigger), Dialog/Drawer details, Tabs/Accordion, useMediaQuery, `cn` fix                                |
| [Environments](./environments.md)                   | Account runbook (Vercel, Supabase, Resend, Sentry, GA4), env matrix, Sentry scrubbing, local Supabase, Free-plan keep-alive                       |
| [Go-live runbook](./go-live.md)                     | Launch day: prerequisites, domain and DNS cut-over, webhooks, Search Console, checks, rollback                                                    |
| [Consultation requests](./consultation-requests.md) | Shared zod schema, honeypot and fill-time token, IP hashing, the server action, emails, the form and its states, e2e fake backend                 |
| [Database](./database.md)                           | Tables, RLS without policies, the write functions, rate limits, newsletter tokens, pgTAP, migrations                                              |
| [Newsletter](./newsletter.md)                       | Double opt-in, signed links, Resend segment, health check, the Newsletter card and the link pages                                                 |
| [Cookie consent](./consent.md)                      | The consent cookie and store, banner, preferences, Switch, footer settings, sticky CTA gate, GA4 after consent                                    |
| [CI](./ci.md)                                       | The pull-request checks, Lighthouse budgets, e2e on a production build, pgTAP in Docker, reading failures                                         |
| [Dependencies](./dependencies.md)                   | Exact pins, release age, patching a vulnerable package (direct, in range, scoped override), open advisories                                       |
| [CMS (Sanity)](./cms.md)                            | Content model (post/author/category), translation plugins, embedded Studio, type generation                                                       |
| [Editing the blog](./editing-the-blog.md)           | For editors: writing, images and alt text, translating, publishing, what happens after Publish                                                    |
| [Accessibility](./accessibility.md)                 | 44 px touch targets: the `touch-target` utility and the harness hit-test check                                                                    |
| [Performance](./performance.md)                     | What loads before first paint, simulated vs observed LCP, lazy chunks, client messages, rules for new code                                        |
| [Blog](./blog.md)                                   | The listing (URL state, streamed results, search, filters, paging) and the post page (TOC, language switch, related); blog SEO (JSON-LD, sitemap) |

Each guide follows the same shape: what we built, how it works at runtime, the files one
by one (and why), how the tests protect it, and day-to-day rules.
