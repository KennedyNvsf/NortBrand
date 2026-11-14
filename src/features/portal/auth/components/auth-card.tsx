import type { ReactNode } from "react";

/*
 * The sign-in card (Figma Login Card 516:26 / 516:89; tablet CP-T01; mobile CP-M01),
 * shared by client sign-in (#131) and team sign-in (#132).
 * - Desktop (≥1024): two 520 px halves, form left, brand panel right; radius/lg,
 *   border/default. The page is white like the rest of the site (lead, 2026-11-14), so
 *   the card takes the deeper shadow/card-hover token to stand off it.
 * - Tablet: one stacked card, brand header on top.
 * - Mobile: no card; the brand header runs edge to edge above the form.
 * The form comes first in the DOM (it holds the H1 and every control); the brand panel
 * is moved above it visually below 1024 px.
 */
export function AuthCard({
  form,
  brand,
}: {
  form: ReactNode;
  brand: ReactNode;
}) {
  return (
    <div className="flex flex-col md:mx-auto md:max-w-[560px] md:overflow-hidden md:rounded-lg md:border md:border-border-default md:bg-bg-surface md:shadow-card-hover lg:grid lg:max-w-[1040px] lg:grid-cols-2">
      <div className="order-last px-5 pt-7 pb-10 md:px-8 md:pt-9 md:pb-8 lg:order-first lg:px-14 lg:pt-14 lg:pb-12">
        {form}
      </div>
      <div className="order-first lg:order-last lg:flex">{brand}</div>
    </div>
  );
}
