"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/*
 * Pages whose address differs between languages (a blog post has one slug per
 * language) tell the LocaleSwitcher where each language's version lives. Everywhere
 * else the switcher keeps the same path.
 * - The layout renders <AlternatePathsProvider>; the page renders <AlternatePaths>.
 *   The paths are stored with the pathname that set them and ignored on any other
 *   page, so a client navigation can never show the previous page's links.
 * - Until hydration the switcher links to the same path; the post page handles that
 *   case on the server (src/app/[locale]/(site)/blog/[slug]/page.tsx).
 */

type Paths = Record<Locale, `/${string}`>;
type Entry = { pathname: string; paths: Paths };

const AlternatePathsContext = createContext<{
  entry: Entry | null;
  setEntry: (entry: Entry | null) => void;
}>({ entry: null, setEntry: () => undefined });

export function AlternatePathsProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  return (
    <AlternatePathsContext value={{ entry, setEntry }}>
      {children}
    </AlternatePathsContext>
  );
}

/** Declares this page's address in every language. Renders nothing. */
export function AlternatePaths({ paths }: { paths: Paths }) {
  const pathname = usePathname();
  const { setEntry } = useContext(AlternatePathsContext);

  // `paths` comes from the server payload, so it keeps its identity between renders.
  useEffect(() => {
    setEntry({ pathname, paths });
    return () => {
      setEntry(null);
    };
  }, [pathname, paths, setEntry]);

  return null;
}

/** The current page's path per language, or null when it is the same in each. */
export function useAlternatePaths(): Paths | null {
  const pathname = usePathname();
  const { entry } = useContext(AlternatePathsContext);
  return entry?.pathname === pathname ? entry.paths : null;
}
