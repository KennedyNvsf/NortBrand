import type { CSSProperties } from "react";

/**
 * Email clients ignore CSS variables and most stylesheets, so the brand tokens from
 * src/app/globals.css are copied here as literal values and applied inline. Keep them in
 * step with the tokens; do not add colours that are not tokens.
 */
export const emailTokens = {
  bgPrimary: "#faf9f8", // --color-bg-primary (neutral/50)
  bgSurface: "#ffffff", // --color-bg-surface
  textPrimary: "#150d0d", // --color-text-primary (neutral/900)
  textMuted: "#4a4241", // --color-text-muted (neutral/700)
  textAccent: "#c21f1f", // --color-text-accent (red/600, small red text)
  borderDefault: "#e7e3e2", // --color-border-default (neutral/200)
  actionPrimaryFill: "#dc2626", // --color-action-primary-fill (primary buttons)
  radiusMd: "10px", // --radius-md (buttons)
  radiusLg: "16px", // --radius-lg (forms, cards)
  // No web font: loading Instrument Sans would make every mail client fetch it remotely.
  fontFamily:
    '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
} as const;

export const styles = {
  body: {
    backgroundColor: emailTokens.bgPrimary,
    color: emailTokens.textPrimary,
    fontFamily: emailTokens.fontFamily,
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: emailTokens.bgSurface,
    border: `1px solid ${emailTokens.borderDefault}`,
    borderRadius: emailTokens.radiusLg,
    maxWidth: "560px",
    padding: "32px",
  },
  wordmark: {
    color: emailTokens.textPrimary,
    fontSize: "18px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    margin: "0 0 24px",
  },
  heading: {
    color: emailTokens.textPrimary,
    fontSize: "24px",
    fontWeight: 600,
    lineHeight: "32px",
    margin: "0 0 16px",
  },
  text: {
    color: emailTokens.textPrimary,
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px",
  },
  label: {
    color: emailTokens.textMuted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
  },
  value: {
    color: emailTokens.textPrimary,
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  // Keeps the visitor's line breaks; React already escapes the text.
  message: {
    color: emailTokens.textPrimary,
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px",
    whiteSpace: "pre-wrap",
  },
  link: { color: emailTokens.textAccent, textDecoration: "underline" },
  // White on the primary fill is 4.8:1 (CLAUDE.md › Accessibility decisions).
  button: {
    backgroundColor: emailTokens.actionPrimaryFill,
    borderRadius: emailTokens.radiusMd,
    color: emailTokens.bgSurface,
    display: "inline-block",
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "24px",
    padding: "12px 24px",
    textDecoration: "none",
  },
  hr: { borderColor: emailTokens.borderDefault, margin: "24px 0" },
  footer: {
    color: emailTokens.textMuted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
  },
} satisfies Record<string, CSSProperties>;
