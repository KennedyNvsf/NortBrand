import type { ReactNode } from "react";
import { Calendar } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { BOOKING_HREF } from "@/content/navigation";
import { Link } from "@/i18n/navigation";
import { ICON_STROKE } from "@/lib/icons";

/*
 * Every "Book a Consultation" button: a primary button linking to the consultation
 * form, whose arrow turns into a calendar on hover and keyboard focus (the same
 * Calendar glyph as the CTA band card), previewing where the link leads. Extra props
 * (className, onClick from SheetClose, data attributes) pass through to the Button.
 */
type BookingButtonProps = {
  children: ReactNode;
} & Omit<ButtonProps, "asChild" | "children" | "showIcon" | "hoverIcon">;

export function BookingButton({ children, ...props }: BookingButtonProps) {
  return (
    <Button
      asChild
      showIcon
      hoverIcon={<Calendar strokeWidth={ICON_STROKE} aria-hidden />}
      {...props}
    >
      <Link href={BOOKING_HREF}>{children}</Link>
    </Button>
  );
}
