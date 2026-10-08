import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ArticleCard, ArticleCardSkeleton } from "./article-card";
import { ServiceCard } from "./service-card";
import { TextLink } from "./text-link";

// next-intl's Link needs a request locale; a plain anchor is enough to test markup.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

const service = {
  icon: "calendar",
  title: "Booking & Scheduling",
  description: "Turn your services into a clear, bookable experience.",
  actionLabel: "Learn More",
} as const;

describe("TextLink", () => {
  it("renders a link with a decorative trailing arrow", () => {
    const html = renderToStaticMarkup(
      <TextLink href="/services">Learn More</TextLink>,
    );
    expect(html).toMatch(/^<a [^>]*href="\/services"/);
    expect(html).toContain("Learn More");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("keeps a 44 px touch target that relaxes on desktop", () => {
    const html = renderToStaticMarkup(<TextLink href="/">Go</TextLink>);
    expect(html).toContain("min-h-11");
    expect(html).toContain("lg:min-h-0");
  });

  it("can hide the icon", () => {
    const html = renderToStaticMarkup(
      <TextLink href="/" showIcon={false}>
        Go
      </TextLink>,
    );
    expect(html).not.toContain("<svg");
  });
});

describe("ServiceCard", () => {
  it("renders as one link when given an href", () => {
    const html = renderToStaticMarkup(
      <ServiceCard href="/services" {...service} />,
    );
    expect(html).toMatch(/^<a [^>]*href="\/services"/);
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain("Booking &amp; Scheduling");
  });

  it("renders as a type=button otherwise, passing trigger props through", () => {
    const html = renderToStaticMarkup(
      <ServiceCard {...service} aria-haspopup="dialog" />,
    );
    expect(html).toMatch(/^<button [^>]*type="button"/);
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("only uses phrasing content, so it is valid inside a button", () => {
    const html = renderToStaticMarkup(<ServiceCard {...service} />);
    expect(html).not.toMatch(/<(div|p|h\d)[ >]/);
  });
});

describe("ArticleCard", () => {
  const article = {
    href: "/blog/brand-refresh",
    title: "5 Signs Your Brand Needs a Refresh",
    excerpt: "Some signals are obvious. Most aren't.",
    category: "Branding",
    byline: "NortBrand · Sep 2026",
    actionLabel: "Read More",
  };

  it("is a single link with the title as an h3 by default", () => {
    const html = renderToStaticMarkup(<ArticleCard {...article} />);
    expect(html).toMatch(/^<a [^>]*href="\/blog\/brand-refresh"/);
    expect(html).toContain("<h3");
    expect(html).toContain("Branding");
  });

  it("accepts another heading level", () => {
    const html = renderToStaticMarkup(
      <ArticleCard {...article} headingLevel="h2" />,
    );
    expect(html).toContain("<h2");
  });

  it("treats the thumbnail as decorative", () => {
    const html = renderToStaticMarkup(
      <ArticleCard {...article} image={{ src: "/images/placeholder/x.jpg" }} />,
    );
    expect(html).toMatch(/<img[^>]*alt=""/);
  });

  it("has a skeleton hidden from assistive tech", () => {
    const html = renderToStaticMarkup(<ArticleCardSkeleton />);
    expect(html).toContain('aria-hidden="true"');
  });
});
