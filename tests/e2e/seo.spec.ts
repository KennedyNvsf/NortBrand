import { expect, test, type Page } from "@playwright/test";

import { locales, localizedPath, routes } from "./routes";
import { onPreview } from "./target";

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
    expect(xml).not.toContain("/newsletter");
  });

  test("robots.txt keeps the Studio out and points to the sitemap", async ({
    request,
  }) => {
    test.skip(
      onPreview,
      "a preview's robots.txt disallows everything (next test)",
    );
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toContain("Disallow: /studio");
    expect(text).toMatch(/Sitemap: \S+\/sitemap\.xml/);
  });

  test("a preview's robots.txt disallows everything", async ({ request }) => {
    test.skip(!onPreview, "only Vercel previews block all crawling");
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toMatch(/Disallow: \/\s*$/m);
    expect(text).not.toContain("Sitemap:");
  });

  test("the embedded Studio is noindex and never sent through the locale proxy", async ({
    request,
  }) => {
    // #58: /studio has its own root layout, outside [locale]. Its HTML is a shell; the
    // Studio itself runs in the browser (and needs a real Sanity project to sign in).
    const response = await request.get("/studio", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    expect(html).not.toContain("data-consent-banner");
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
      "/studio",
    );
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

  test("serves the favicon, the Apple touch icon and the square logo", async ({
    page,
    request,
  }) => {
    await page.goto("/en");

    // ICO header: reserved 0, type 1 (icon), then the image count.
    const favicon = await request.get("/favicon.ico");
    expect(favicon.status()).toBe(200);
    const ico = await favicon.body();
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    expect(ico.readUInt16LE(4)).toBe(3);

    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute("sizes", "180x180");
    const appleHref = await appleIcon.getAttribute("href");
    const apple = await request.get(appleHref ?? "");
    expect(apple.headers()["content-type"]).toBe("image/png");
    const applePng = await apple.body();
    expect([applePng.readUInt32BE(16), applePng.readUInt32BE(20)]).toEqual([
      180, 180,
    ]);

    // The Organization logo is a square raster (Google asks for 112 px or more).
    const organization = (await jsonLd(page)).find(
      (block): block is { logo: string } =>
        typeof block === "object" &&
        block !== null &&
        "@type" in block &&
        block["@type"] === "Organization" &&
        "logo" in block &&
        typeof block.logo === "string",
    );
    expect(organization?.logo).toMatch(/\/images\/logo-square\.png$/);
    const logo = await request.get(new URL(organization?.logo ?? "").pathname);
    expect(logo.headers()["content-type"]).toBe("image/png");
    const logoPng = await logo.body();
    expect([logoPng.readUInt32BE(16), logoPng.readUInt32BE(20)]).toEqual([
      512, 512,
    ]);
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
