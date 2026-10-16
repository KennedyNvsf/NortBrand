import { expect, test, type Page } from "@playwright/test";

import { locales, localizedPath, routes } from "./routes";

/*
 * SEO output (ticket #15) against the production build: crawl files, social meta and
 * JSON-LD. Unit tests cover the builders; this checks what Next.js actually serves.
 * URLs are absolute against NEXT_PUBLIC_SITE_URL, so assertions match path suffixes.
 */

// Indexable pages only: the 404 and the noindex newsletter link pages stay out.
const pages = routes.filter(
  (route) => !("notFound" in route) && !("noindex" in route),
);

async function jsonLd(page: Page): Promise<unknown[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks.map((text): unknown => JSON.parse(text));
}

test.describe("crawl files", () => {
  test("sitemap.xml lists every page in both locales with hreflang", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();

    for (const route of pages) {
      for (const locale of locales) {
        expect(xml).toMatch(
          new RegExp(`<loc>[^<]*${localizedPath(locale, route.path)}</loc>`),
        );
      }
    }
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain("/blog");
    expect(xml).not.toContain("/newsletter");
  });

  test("robots.txt keeps the Studio out and points to the sitemap", async ({
    request,
  }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toContain("Disallow: /studio");
    expect(text).toMatch(/Sitemap: \S+\/sitemap\.xml/);
  });
});

test.describe("page metadata", () => {
  for (const route of pages) {
    test(`${route.name} has share metadata and the Organization`, async ({
      page,
    }) => {
      await page.goto(localizedPath("pt", route.path));

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        /NortBrand/,
      );
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        "content",
        "pt_PT",
      );
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /\/pt\/opengraph-image$/,
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );

      expect(await jsonLd(page)).toContainEqual(
        expect.objectContaining({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "NortBrand",
        }),
      );
    });
  }

  test("the share image is a 1200 × 630 PNG", async ({ request }) => {
    const response = await request.get("/en/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    // PNG IHDR: width and height are big-endian at bytes 16 and 20.
    const png = await response.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  test("Services lists the five services as Service JSON-LD", async ({
    page,
  }) => {
    await page.goto("/en/services");
    const graph = (await jsonLd(page)).find(
      (block): block is { "@graph": { "@type": string; "@id": string }[] } =>
        typeof block === "object" && block !== null && "@graph" in block,
    );

    expect(graph?.["@graph"]).toHaveLength(5);
    expect(graph?.["@graph"].every((s) => s["@type"] === "Service")).toBe(true);
    expect(graph?.["@graph"][0]?.["@id"]).toMatch(/\/en\/services#web-design$/);
  });
});
