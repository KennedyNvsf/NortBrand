import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware Link, redirect, usePathname and useRouter. Switching locale through
// these APIs also updates the NEXT_LOCALE preference cookie.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
