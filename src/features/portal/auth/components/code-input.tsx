"use client";

import { unstable_OneTimePasswordField as OneTimePasswordField } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The 6-box code (Figma CP-02 516:95; CP-08 "Code · wrong"). Built on Radix's
 * one-time-password field, which handles typing, paste, Backspace, arrow keys,
 * autocomplete="one-time-code" and the numeric keyboard (radix-ui is pinned exactly,
 * so its `unstable_` export can't change under us).
 * - Boxes: 64 px tall, radius/md; focus: 2 px red; filled digits pop 0.96 → 1.
 * - status "error": red borders and one shake (14 Portal — Motion › Code entry);
 *   "success": green borders before the hand-off. Reduced motion: no pop, no shake.
 * - One accessible name for the group; the error text is linked by the caller.
 * - autoSubmit submits the surrounding form natively once the sixth digit lands; the
 *   form reads the code from the hidden input. (No onAutoSubmit as well: that would
 *   send the code twice and count one wrong code as two.)
 */

type CodeInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  status: "idle" | "error" | "success";
  /** Changes on every wrong code, so the shake replays. */
  shakeKey: number;
  describedBy?: string;
  disabled?: boolean;
};

const LENGTH = 6;

export function CodeInput({
  value,
  onValueChange,
  label,
  status,
  shakeKey,
  describedBy,
  disabled,
}: CodeInputProps) {
  return (
    <OneTimePasswordField.Root
      key={shakeKey}
      value={value}
      onValueChange={onValueChange}
      autoSubmit
      validationType="numeric"
      disabled={disabled}
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={status === "error" || undefined}
      className={cn(
        "flex gap-2 md:gap-3",
        status === "error" && shakeKey > 0 && "motion-safe:animate-code-shake",
      )}
    >
      {Array.from({ length: LENGTH }, (_, index) => (
        <OneTimePasswordField.Input
          key={index}
          aria-label={`${label} ${String(index + 1)}/${String(LENGTH)}`}
          className={cn(
            "h-14 min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface text-center text-[24px] font-semibold text-text-primary outline-none md:h-16 md:text-[28px]",
            "transition-[border-color] duration-(--duration-fast) ease-standard",
            "focus:border-2 focus:border-action-primary",
            index < value.length && "motion-safe:animate-code-pop",
            "disabled:bg-bg-primary disabled:text-text-disabled",
            status === "error" && "border-2 border-action-primary",
            status === "success" && "border-2 border-action-secondary",
          )}
        />
      ))}
      <OneTimePasswordField.HiddenInput name="code" />
    </OneTimePasswordField.Root>
  );
}
