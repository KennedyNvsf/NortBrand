import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/page-transition";

/* Remounted on every navigation, unlike the layout: the hook for the page fade. */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
