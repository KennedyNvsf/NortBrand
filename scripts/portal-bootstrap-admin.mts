/*
 * Creates the team portal's first admin (#132, ADR-009). Once per Supabase project.
 *
 *   pnpm portal:bootstrap-admin --email ana@example.com --name "Ana Costa"
 *
 * 1. Creates (or finds) the auth user with the service-role key: auth administration
 *    only, the key's one permitted use. Reads NEXT_PUBLIC_SUPABASE_URL and
 *    SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local, so point them at the
 *    project you mean (dev, prod or local).
 * 2. Prints one SQL line. Run it in that project's SQL editor: the bootstrap function has
 *    no grants (only the SQL editor can call it) and refuses once an active admin exists.
 *    Every later teammate is invited from the portal.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

// Variables already set in the environment win over .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();

if (
  !email ||
  !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
  !name ||
  name.length > 80
) {
  console.error(
    'Usage: pnpm portal:bootstrap-admin --email <email> --name "<name, up to 80 characters>"',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (environment or .env.local).",
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}).auth.admin;

async function findUserId(address: string): Promise<string | null> {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error)
      throw new Error(`Listing users failed (${error.code ?? "unknown"})`);
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === address,
    );
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const created = await admin.createUser({ email, email_confirm: true });
let userId = created.data.user?.id ?? null;
if (created.error) {
  if (created.error.code !== "email_exists") {
    console.error(
      `Creating the auth user failed (${created.error.code ?? "unknown"}).`,
    );
    process.exit(1);
  }
  userId = await findUserId(email);
}
if (!userId) {
  console.error("Could not find the auth user for that email.");
  process.exit(1);
}

const sqlName = name.replaceAll("'", "''");
console.log(`Auth user ready for ${email} in ${new URL(url).host}.`);
console.log("Now run this in that project's SQL editor:\n");
console.log(
  `  select private.portal_bootstrap_first_admin('${userId}', '${sqlName}');\n`,
);
console.log("Then sign in at /team/sign-in with a code.");
