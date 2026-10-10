import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom type roles from globals.css so `text-h1` (font size)
// and `text-text-primary` (color) are not treated as conflicting classes.
// The named spacing tokens (p-xl, gap-md…) are registered too, so an override such as
// `p-0` replaces a primitive's `p-xl` instead of both classes surviving.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["xs", "sm", "md", "lg", "xl", "2xl"],
    },
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display",
            "display-section",
            "h1",
            "h2",
            "h3",
            "h4",
            "lead",
            "body",
            "small",
            "label",
            "caption",
            "overline",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
