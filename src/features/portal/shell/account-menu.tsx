"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useTransition } from "react";

import { ICON_STROKE } from "@/lib/icons";

/*
 * The account menu in the portal top bars (#133): who is signed in, and Sign out. Radix
 * DropdownMenu gives the keyboard model (Enter/Space/arrow keys, Esc returns focus).
 * Sign out loads the sign-in page in full, so nothing signed-in can be restored from the
 * router's cache.
 */
export function AccountMenu({
  initials,
  name,
  email,
  accountLabel,
  signOutLabel,
  signOut,
}: {
  initials: string;
  name: string | null;
  email: string;
  accountLabel: string;
  signOutLabel: string;
  signOut: () => Promise<string>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={accountLabel}
        className="touch-target flex items-center gap-1.5 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <span className="grid size-7 place-items-center rounded-full border border-border-default bg-bg-primary text-[11px] font-semibold text-text-primary">
          {initials}
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="hidden size-4 text-text-primary md:block"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-60 rounded-lg border border-border-default bg-bg-surface p-2 shadow-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="px-3 py-2">
            {name ? (
              <p className="text-label text-text-primary">{name}</p>
            ) : null}
            <p className="truncate text-small text-text-muted">{email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border-default" />
          <DropdownMenu.Item
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault();
              startTransition(async () => {
                window.location.assign(await signOut());
              });
            }}
            className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-[14px] text-text-primary outline-none data-highlighted:bg-bg-primary data-disabled:opacity-60"
          >
            <LogOut
              aria-hidden
              strokeWidth={ICON_STROKE}
              className="size-[18px]"
            />
            {signOutLabel}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
