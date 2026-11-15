"use client";

import { Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";

import { ICON_STROKE } from "@/lib/icons";

import type { TicketStatus } from "../../../overview/domain";
import { TICKET_STATUSES } from "../../../overview/domain";

/*
 * The card's status menu (#137): the keyboard and touch way to move a ticket (drag is
 * desktop-pointer only). Radix gives it arrow keys, Esc, focus return and menu roles.
 */
export function StatusMenu({
  label,
  heading,
  current,
  statuses,
  onMove,
  children,
}: {
  label: string;
  heading: string;
  current: TicketStatus;
  statuses: Record<TicketStatus, string>;
  onMove: (status: TicketStatus) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild aria-label={label}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-md border border-border-default bg-bg-surface p-1 shadow-card-hover motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 py-2 text-[12px] font-medium text-text-muted">
            {heading}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={current}
            onValueChange={(value) => {
              const next = TICKET_STATUSES.find((status) => status === value);
              if (next && next !== current) onMove(next);
            }}
          >
            {TICKET_STATUSES.map((status) => (
              <DropdownMenu.RadioItem
                key={status}
                value={status}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-[14px] text-text-primary outline-none data-highlighted:bg-bg-primary lg:min-h-9"
              >
                {statuses[status]}
                <DropdownMenu.ItemIndicator>
                  <Check
                    aria-hidden
                    strokeWidth={ICON_STROKE}
                    className="size-4"
                  />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
