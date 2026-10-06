# ADR-003: Sanity for the blog only, one document per language

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "CMS" (nb-se section 2.1)

## Context

The team must publish and translate blog posts without a deploy. The handover keeps
services, FAQ and page copy as typed content in the repository for the MVP. There are
3 posts per language at launch.

## Decision

- Sanity holds blog posts, authors and categories only.
- Each language is its own document, linked as translations with the official
  `@sanity/document-internationalization` plugin. Each language version has its own slug,
  title, excerpt and SEO fields, and a post may exist in only one language.
- Studio is embedded at `/studio` in the Next.js app. It is excluded from the sitemap and
  from the locale proxy, and marked `noindex`.
- A signed webhook calls `/api/revalidate`, which verifies the secret before revalidating
  by tag.
- Services, FAQ and site config stay in `src/content/`.

## Alternatives considered

- **Field-level localization in one document.** Rejected: slugs and SEO fields differ per
  language, and a post may exist in only one language.
- **MDX in the repository.** Rejected: every post would need a developer and a deploy.

## Consequences

- Editors publish without deploys.
- Changes to services and the FAQ still need a developer.
- Adds a CMS account, a webhook secret and a read token to manage.
