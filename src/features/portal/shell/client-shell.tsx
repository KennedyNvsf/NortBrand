import { Mail } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";
import type { Locale } from "@/i18n/routing";
import { ICON_STROKE } from "@/lib/icons";

import { signOutClient } from "../auth/actions";
import { AccountMenu } from "./account-menu";
import { initials, type ClientShellData } from "./client-data";
import { PortalNav, type PortalNavItem } from "./portal-nav";
import { ProjectSwitcher } from "./project-switcher";

/*
 * The client portal frame (#133; Figma CP-03 519:51, CP-T03 557:576, CP-M03 554:371).
 *   desktop  top bar (64) · sidebar (232: sections with counts, "Your team") · content
 *   tablet   top bar · section tabs under it · content
 *   mobile   top bar (56: logo, message, account) · content · bottom tab bar
 * "Message your team" is a mailto: to the project lead. Strings arrive as props.
 */

export type ClientShellCopy = {
  projectLabel: string;
  navLabel: string;
  nav: Record<"overview" | "tasks" | "timeline" | "files" | "updates", string>;
  yourTeam: string;
  messageTeam: string;
  messageShort: string;
  account: string;
  signOut: string;
  switchProject: string;
};

export function clientNavItems(
  base: string,
  copy: ClientShellCopy,
  counts: ClientShellData["counts"],
): PortalNavItem[] {
  return [
    { key: "overview", href: base, label: copy.nav.overview, icon: "overview" },
    {
      key: "tasks",
      href: `${base}/tasks`,
      label: copy.nav.tasks,
      icon: "tasks",
      count: counts.tasks,
      matchNested: true,
    },
    {
      key: "timeline",
      href: `${base}/timeline`,
      label: copy.nav.timeline,
      icon: "timeline",
    },
    {
      key: "files",
      href: `${base}/files`,
      label: copy.nav.files,
      icon: "files",
      count: counts.files,
    },
    {
      key: "updates",
      href: `${base}/updates`,
      label: copy.nav.updates,
      icon: "updates",
    },
  ];
}

export function ClientShell({
  data,
  locale,
  copy,
  children,
}: {
  data: ClientShellData;
  locale: Locale;
  copy: ClientShellCopy;
  children: ReactNode;
}) {
  const base = `/${locale}/portal/${data.project.publicId}`;
  const items = clientNavItems(base, copy, data.counts);
  const mailto = `mailto:${data.messageTo}?subject=${encodeURIComponent(
    `${data.project.name} (${data.project.publicId})`,
  )}`;

  return (
    <div className="flex min-h-dvh flex-col bg-bg-surface">
      <header className="flex h-14 items-center gap-4 border-b border-border-default px-(--gutter) md:h-16 md:pr-8 md:pl-6">
        <Link
          href={base}
          className="touch-target shrink-0"
          aria-label="NortBrand"
        >
          <Logo className="h-auto w-[92px] md:w-[104px]" />
        </Link>
        <span
          aria-hidden
          className="hidden h-5 w-px bg-border-default md:block"
        />
        <div className="hidden min-w-0 items-center gap-4 md:flex">
          <ProjectSwitcher
            current={data.project}
            label={copy.switchProject}
            projects={data.projects.map((project) => ({
              ...project,
              href: `/${locale}/portal/${project.publicId}`,
            }))}
          />
          <span className="shrink-0 rounded-sm border border-border-default bg-bg-primary px-2 py-[3px] text-[12px] font-medium tracking-[0.04em] text-text-muted">
            {data.project.publicId}
          </span>
        </div>
        <span className="flex-1" />
        <a
          href={mailto}
          aria-label={copy.messageTeam}
          className="grid size-11 shrink-0 place-items-center text-[14px] font-medium text-text-primary hover:text-text-accent md:flex md:size-auto md:min-h-11 md:items-center md:gap-2"
        >
          <Mail aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
          <span aria-hidden className="hidden md:inline lg:hidden">
            {copy.messageShort}
          </span>
          <span aria-hidden className="hidden lg:inline">
            {copy.messageTeam}
          </span>
        </a>
        <AccountMenu
          initials={initials(data.viewer.name ?? data.viewer.email)}
          name={data.viewer.name}
          email={data.viewer.email}
          accountLabel={copy.account}
          signOutLabel={copy.signOut}
          signOut={signOutClient.bind(null, locale)}
        />
      </header>

      <PortalNav
        items={items}
        label={copy.navLabel}
        variant="tabs"
        className="hidden md:block lg:hidden"
      />

      <div className="flex flex-1">
        <aside className="hidden w-[232px] shrink-0 flex-col gap-1 border-r border-border-default px-4 py-6 lg:flex">
          <p className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase">
            {copy.projectLabel}
          </p>
          <PortalNav items={items} label={copy.navLabel} variant="sidebar" />
          <span className="flex-1" />
          {data.team.length > 0 ? (
            <section
              aria-labelledby="portal-your-team"
              className="flex flex-col gap-3 border-t border-border-default pt-4"
            >
              <h2
                id="portal-your-team"
                className="text-[11px] font-medium tracking-[0.08em] text-text-muted uppercase"
              >
                {copy.yourTeam}
              </h2>
              <ul className="flex flex-col gap-3">
                {data.team.map((person) => (
                  <li key={person.name} className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold text-text-primary"
                    >
                      {person.initials}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium text-text-primary">
                        {person.name}
                      </span>
                      <span className="truncate text-[12px] text-text-muted">
                        {person.roleLabel}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
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
    </div>
  );
}
