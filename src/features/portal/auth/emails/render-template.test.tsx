import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PORTAL_CODE_SUBJECT,
  renderPortalCodeTemplate,
  SUPABASE_TOKEN,
} from "./render-template";

describe("portal sign-in code template", () => {
  it("is committed in step with the component (regenerate with pnpm test -- -u)", async () => {
    const html = await renderPortalCodeTemplate();
    await expect(html).toMatchFileSnapshot(
      "../../../../../supabase/templates/portal-code.html",
    );
  });

  it("has Supabase's code placeholder in both languages and branches on the user's locale", async () => {
    const html = await renderPortalCodeTemplate();
    expect(html.split(SUPABASE_TOKEN)).toHaveLength(3);
    expect(html.startsWith('{{ if eq .Data.locale "en" }}')).toBe(true);
    expect(html).toContain('lang="en"');
    expect(html).toContain('lang="pt"');
  });

  it("uses the same subject as the local Supabase config", () => {
    const config = readFileSync(
      join(__dirname, "../../../../../supabase/config.toml"),
      "utf8",
    );
    expect(config).toContain(`subject = "${PORTAL_CODE_SUBJECT}"`);
  });
});
