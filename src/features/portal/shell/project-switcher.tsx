"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";

import { ICON_STROKE } from "@/lib/icons";

/*
 * The project name in the client top bar (#133). A client with one project sees just the
 * name; with several, the name opens a menu of their projects. Hrefs are built on the
 * server (locale included), so this stays free of next-intl.
 */
export function ProjectSwitcher({
  current,
  projects,
  label,
}: {
  current: { publicId: string; name: string };
  projects: { publicId: string; name: string; href: string }[];
  label: string;
}) {
  const name = (
    <span className="truncate text-[14px] font-medium text-text-primary">
      {current.name}
    </span>
  );
  if (projects.length < 2) return name;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${label}: ${current.name}`}
        className="touch-target flex min-w-0 items-center gap-1 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {name}
        <ChevronDown
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="size-4 shrink-0"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-64 rounded-lg border border-border-default bg-bg-surface p-2 shadow-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-overline text-text-muted">
            {label}
          </DropdownMenu.Label>
          {projects.map((project) => {
            const isCurrent = project.publicId === current.publicId;
            return (
              <DropdownMenu.Item key={project.publicId} asChild>
                <Link
                  href={project.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className="flex h-11 items-center gap-2.5 rounded-md px-3 text-[14px] text-text-primary outline-none data-highlighted:bg-bg-primary"
                >
                  <span className="flex-1 truncate">{project.name}</span>
                  <span className="text-[12px] text-text-muted">
                    {project.publicId}
                  </span>
                  {isCurrent ? (
                    <Check
                      aria-hidden
                      strokeWidth={ICON_STROKE}
                      className="size-4"
                    />
                  ) : null}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
