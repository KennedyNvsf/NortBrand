# Developer guides

Living, topic-based explanations of how the code works, written for a developer joining
the project. Each ticket's walkthrough lands here (see the workflow rules in
`CLAUDE.md`). When a ticket changes a topic, update its guide in the same pull request so
the guides always match the code.

| Guide                                   | Covers                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Localization](./localization.md)       | EN/PT routing, messages, hreflang, pseudo-localization, release guard                       |
| [Components](./components.md)           | Logo, Badge, FieldError, Select, icons, TextLink, ServiceCard, ArticleCard                  |
| [Navigation](./navigation.md)           | SiteNav, sticky header, active links, mobile menu, language switcher                        |
| [Page layout](./layout.md)              | The (site) route group, SiteFooter, services and legal links, cached year                   |
| [Calls to action](./calls-to-action.md) | CtaBand (rich headline, photo, scrim), StickyCta (IntersectionObserver, inert)              |
| [Home page](./home-page.md)             | Home sections, FeatureSplit, SectionHeader, highlight tags, process steps, sticky CTA scope |
| [Services page](./services-page.md)     | Photo hero, service blocks, Dialog/Drawer details, Tabs/Accordion, useMediaQuery, `cn` fix  |

Each guide follows the same shape: what we built, how it works at runtime, the files one
by one (and why), how the tests protect it, and day-to-day rules.
