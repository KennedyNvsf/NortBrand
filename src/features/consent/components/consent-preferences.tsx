"use client";

import { useId, useState, type ComponentType, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { ICON_STROKE } from "@/lib/icons";
import { MEDIA_MD, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import type { Consent } from "../consent";
import { closeConsentPreferences, saveConsent } from "../consent-store";

/*
 * Figma: 08 System / States › Cookie Preferences: desktop 326:132, tablet 382:326
 * (centred dialog), mobile 382:193 (bottom sheet). Same Dialog-on-md / Drawer-on-mobile
 * split as the Services details (Handoff, Motion Spec › Bottom sheet).
 * - Modal: focus trap, Esc and the close button dismiss without saving, focus returns
 *   to whatever opened it (the banner link or the footer button).
 * - Essential is Locked on; Analytics starts at the current choice (off if none).
 * - Reject all and Save preferences have equal weight; neither is pre-selected.
 */

type TextPart = ComponentType<{ className?: string; children: ReactNode }>;
type ClosePart = ComponentType<{ asChild: boolean; children: ReactNode }>;

export function ConsentPreferences({
  open,
  current,
}: {
  open: boolean;
  current: Consent | null;
}) {
  const isTabletUp = useMediaQuery(MEDIA_MD);
  const onOpenChange = (next: boolean) => {
    if (!next) closeConsentPreferences();
  };

  // Remount the body on every opening, so the switch starts from the saved choice.
  const body = (Title: TextPart, Description: TextPart, Close: ClosePart) =>
    open ? (
      <PreferencesBody
        initialAnalytics={current?.analytics ?? false}
        Title={Title}
        Description={Description}
        Close={Close}
      />
    ) : null;

  if (isTabletUp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-0 md:max-w-150 lg:max-w-150"
        >
          {body(DialogTitle, DialogDescription, DialogClose)}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-xl">
        {body(DrawerTitle, DrawerDescription, DrawerClose)}
      </DrawerContent>
    </Drawer>
  );
}

function PreferencesBody({
  initialAnalytics,
  Title,
  Description,
  Close,
}: {
  initialAnalytics: boolean;
  Title: TextPart;
  Description: TextPart;
  Close: ClosePart;
}) {
  const t = useTranslations("Consent.preferences");
  const [analytics, setAnalytics] = useState(initialAnalytics);

  return (
    <div
      data-consent-preferences=""
      className="flex flex-col gap-5.5 overflow-y-auto px-5 pt-4 pb-8 md:px-9 md:pt-8.5 md:pb-8.5"
    >
      <div className="flex items-center justify-between gap-md">
        <Title className="text-[24px] font-bold tracking-[-0.007em] text-text-primary md:text-[30px]">
          {t("title")}
        </Title>
        <Close asChild>
          <Button
            variant="ghost"
            size="icon"
            className="border border-border-default bg-bg-surface md:size-11 lg:size-10"
          >
            <X strokeWidth={ICON_STROKE} aria-hidden />
            <span className="sr-only">{t("close")}</span>
          </Button>
        </Close>
      </div>
      <Description className="text-body leading-[1.54] text-text-muted md:text-[16px]">
        {t("body")}
      </Description>

      <ul className="flex flex-col border-t border-border-default">
        <Category
          title={t("essentialTitle")}
          body={t("essentialBody")}
          checked
          locked
        />
        <Category
          title={t("analyticsTitle")}
          body={t("analyticsBody")}
          checked={analytics}
          onCheckedChange={setAnalytics}
        />
      </ul>

      <div className="flex flex-col gap-2.5 pt-1 md:flex-row md:justify-end md:gap-md">
        <Button
          variant="secondary"
          className="w-full md:w-auto"
          onClick={() => {
            saveConsent({ analytics: false });
          }}
        >
          {t("rejectAll")}
        </Button>
        <Button
          className="w-full md:w-auto"
          onClick={() => {
            saveConsent({ analytics });
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

function Category({
  title,
  body,
  checked,
  locked = false,
  onCheckedChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  locked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const titleId = useId();
  const bodyId = useId();

  return (
    <li className="flex items-center justify-between gap-md border-b border-border-default py-5.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p id={titleId} className="text-lead font-semibold text-text-primary">
          {title}
        </p>
        <p id={bodyId} className="text-small leading-[1.5] text-text-muted">
          {body}
        </p>
      </div>
      <Switch
        checked={checked}
        locked={locked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(locked && "cursor-default")}
      />
    </li>
  );
}
