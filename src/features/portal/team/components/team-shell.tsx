import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";
import { Toaster } from "@/components/ui/sonner";

import { AccountMenu } from "../../shell/account-menu";
import { initials } from "../../shell/initials";
import { PortalNav, type PortalNavItem } from "../../shell/portal-nav";
import { signOutTeam } from "../actions";
import { teamSearchCopy, teamShellCopy } from "../copy";
import { SearchLauncher } from "../search/components/search-launcher";
import type { TeamShellData } from "../shell-data";

/*
 * The team workspace frame (#133; Figma TM-01 528:189, TM-T01 560:957, TM-M01 559:646).
 *   desktop  top bar (logo, TEAM, search, account) · workspace sidebar · content
 *            (boards use the icon rail instead: `nav="rail"`, from the board ticket)
 *   tablet   top bar · tabs under it · content
 *   mobile   top bar (56) · content · bottom tab bar
 * English only (ADR-009). Search (⌘K) opens a dialog (#142); results respect RLS.
 */

export function teamNavItems(counts: TeamShellData["counts"]): PortalNavItem[] {
  const copy = teamShellCopy.nav;
  return [
    {
      key: "projects",
      href: "/team",
      label: copy.projects,
      icon: "overview",
      count: counts.projects,
    },
    {
      key: "my-tickets",
      href: "/team/my-tickets",
      label: copy.myTickets,
      icon: "tasks",
      count: counts.myTickets,
    },
    { key: "team", href: "/team/team", label: copy.team, icon: "files" },
    {
      key: "settings",
      href: "/team/settings",
      label: copy.settings,
      icon: "settings",
    },
  ];
}

export function TeamShell({
  data,
  nav = "sidebar",
  children,
}: {
  data: TeamShellData;
  nav?: "sidebar" | "rail";
  children: ReactNode;
}) {
  const copy = teamShellCopy;
  const items = teamNavItems(data.counts);

  return (
    <div className="flex min-h-dvh flex-col bg-bg-surface">
      <header className="flex h-14 items-center gap-4 border-b border-border-default px-(--gutter) md:h-16 md:pr-8 md:pl-6">
        <Link
          href="/team"
          className="touch-target shrink-0"
          aria-label="NortBrand team"
        >
          <Logo className="h-auto w-[92px] md:w-[104px]" />
        </Link>
        <span className="shrink-0 rounded-sm bg-action-secondary-subtle px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-action-secondary uppercase">
          {copy.badge}
        </span>
        <SearchLauncher copy={teamSearchCopy} label={copy.searchOpen} />
        <span className="flex-1" />
        {/* Phones: search icon, then the account (Figma TM-M05). */}
        <div className="max-md:order-2">
          <AccountMenu
            initials={initials(data.viewer.name)}
            name={data.viewer.name}
            email={data.viewer.email}
            accountLabel={copy.account}
            signOutLabel={copy.signOut}
            signOut={signOutTeam}
          />
        </div>
      </header>

      <PortalNav
        items={items}
        label={copy.navLabel}
        variant="tabs"
        className="hidden md:block lg:hidden"
      />

      <div className="flex flex-1">
        {nav === "rail" ? (
          <aside className="hidden w-16 shrink-0 border-r border-border-default py-4 lg:block">
            <PortalNav items={items} label={copy.navLabel} variant="rail" />
          </aside>
        ) : (
          <aside className="hidden w-[232px] shrink-0 flex-col gap-1 border-r border-border-default px-4 py-6 lg:flex">
            <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
              {copy.workspace}
            </p>
            <PortalNav items={items} label={copy.navLabel} variant="sidebar" />
          </aside>
        )}
        <main
          id="main"
          className="min-w-0 flex-1 px-(--gutter) pt-6 pb-28 md:pt-8 md:pb-12 lg:px-10"
        >
          {children}
        </main>
      </div>

      <PortalNav
        items={items}
        label={copy.navLabel}
        variant="bottom"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      />
      {/* Toasts (14 Portal — Motion): saved, copied, invite sent. */}
      <Toaster />
    </div>
  );
}
