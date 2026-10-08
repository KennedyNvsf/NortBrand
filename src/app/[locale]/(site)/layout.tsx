import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";

/*
 * Route group for every regular page: nav above, footer below. The group adds no URL
 * segment. Pages that must not have this chrome (the designed 404, per the Handoff:
 * "Footer: shared by every page except the 404") live outside the group.
 */
export default function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
