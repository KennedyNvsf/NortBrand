# Dependencies and security patches

How dependencies are pinned, how we patch a vulnerable one, and what is still open (#88).

## 1. What we did in #88

On 2026-10-24, `next dev` printed a notice that our Next.js version had a known
vulnerability. `pnpm audit` found **31 advisories** (2 critical, 10 high, 16 moderate,
3 low). After #88 there are **2**, both inside CLI tools that never ship in the site.

| Package                 | Before  | After                  | Why it mattered here                                                                                                      |
| ----------------------- | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `next`                  | 16.4.0  | 16.4.1                 | Two critical remote code execution bugs (`use cache`, image optimizer) and a server-action DoS; we use all three features |
| `eslint-config-next`    | 16.4.0  | 16.4.1                 | Kept in step with `next`                                                                                                  |
| `zod`                   | 4.6.5   | 4.6.7                  | High: memory exhaustion while validating; every server action validates with zod                                          |
| transitive (in range)   | various | patched                | `vite`, `fast-uri`, `ip-address`, `body-parser`, `undici@8`, updated within their ranges                                  |
| transitive (exact pins) | various | patched by `overrides` | `js-yaml`, `smol-toml`, `undici@7` inside the Sanity CLI                                                                  |
| `uuid` 10, `zod` 3      | —       | **open**               | Only fixed in a new major; see `docs/tech-debt.md`                                                                        |

All three Next.js advisories applied to this app:

- the blog data layer uses `"use cache"` (`src/features/blog/data.ts`);
- images from the Sanity CDN go through the image optimizer (`images.remotePatterns`);
- both forms are server actions.

The site wasn't deployed yet, so nothing was exposed. The fix had to land before #45.

## 2. How dependencies are pinned

- **Exact versions in `package.json`** (`"next": "16.4.1"`, never `^16.4.1`). A version
  changes only in a reviewed pull request, and the lockfile is the record.
- **Minimum release age.** pnpm refuses versions newer than its minimum release age,
  which protects against a compromised release that gets pulled within hours.
  `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` lists the deliberate exceptions.
  #88 removed the `next@16.4.0` entries because nothing installs that version any more.
- **`allowBuilds`** lists the only packages allowed to run install scripts.

## 3. Patching a vulnerable package, step by step

1. **Read the advisory before touching anything.** `pnpm audit` gives the severity, the
   affected range and the patched version. `pnpm why <package>` tells you which of our
   dependencies pulls it in.
2. **Direct dependency** (in `package.json`): `pnpm add <name>@<exact patched version>`.
   Stay on the same major unless the ticket says otherwise. Check the publish date
   (`pnpm view <name>@<version> time`) against the release-age rule.
3. **Transitive, and the parent allows a newer version:** `pnpm update <name>`. That
   updates it everywhere in the tree within the parents' ranges. No manifest change.
4. **Transitive, and the parent pins an exact old version:** add a scoped override in
   `pnpm-workspace.yaml`:

   ```yaml
   overrides:
     "@vercel/frameworks>js-yaml": 3.15.2
   ```

   Scope it to the parent (`parent>child`) so nothing else is affected. Stay on the
   child's current major so the parent keeps working, and add a comment with the
   advisory ids. Remove the override once the parent ships the fix.

5. **Fixed only in a new major:** don't force it. Record it in `docs/tech-debt.md` with
   where it runs and the risk.
6. Re-run `pnpm audit` and put the before and after numbers in the PR.

**Don't** run `next upgrade --agent=…` or `pnpm update --latest` as a shortcut. Both move
major and minor versions without review.

## 4. What's left, and why it's acceptable

| Advisory                                      | Comes from                    | Runs when                                    |
| --------------------------------------------- | ----------------------------- | -------------------------------------------- |
| `uuid` 10.0.0, moderate (GHSA-w5hq-g745-h8pq) | `typeid-js` in the Sanity CLI | A developer runs a `sanity` command          |
| `zod` 3.25.76, high (GHSA-mrhx-c7xc-m3w5)     | the `shadcn` CLI              | A developer runs `shadcn` to add a component |

Neither one is in the site's bundle or on the server at runtime. Both process our own
input, not visitors'. Re-check them whenever `sanity` or `shadcn` is upgraded.

**Lighthouse CI is kept out of `package.json` (decided 2026-11-05, #83).** `@lhci/cli`
0.15.1 brings five high findings through Lighthouse and Puppeteer (`tmp`,
`extract-zip` ×2, `basic-ftp`, `zod` 3), and `zod` 3 can't be patched with an override.
It runs through `pnpm dlx` instead (the `lhci` script, exact version), only in CI and on
demand, against our own build, in a job with no secrets. The trade-off is that its own
dependencies aren't locked by our lockfile. When upgrading it, change the version in
the `lhci` script, and check that the new version is older than the minimum release age.

## 5. The Sentry notice in `next dev`

`next dev` also warns that `src/instrumentation-client.ts` doesn't export
`onRouterTransitionStart`. We leave it that way on purpose:

- that hook only records navigation traces, and tracing is off (`tracesSampleRate: 0`
  in `src/lib/sentry.ts`);
- exporting it would import `@sentry/nextjs` up front, about 50 KB gzipped, which undoes
  the idle-time loading the file exists for.

A comment in the file explains this, so the warning is expected.

## 6. Day-to-day rules

- A dependency change is its own ticket (`|CHORE|`, or `|SECURITY|` for hardening), with
  the full CI run. A patch release can still change behaviour.
- Run `pnpm audit` before launch and before each production deploy.
- Adding a dependency that the brief doesn't list needs approval first (CLAUDE.md).
