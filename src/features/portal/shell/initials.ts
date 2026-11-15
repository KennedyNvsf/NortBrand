/*
 * "Ana Costa" → "AC" for avatars. Pure, so client components can use it: importing
 * client-data.ts from the browser would pull in the server's Supabase client and env
 * (caught by pnpm check:bundles, #137).
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "•";
}
