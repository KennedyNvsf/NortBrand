import * as React from "react";
import { CircleAlert } from "lucide-react";

import { ICON_STROKE } from "@/lib/icons";
import { cn } from "@/lib/utils";

/*
 * Figma: Input / Select / Textarea › Error Message. Errors always pair an icon with text
 * (never colour alone). Red/600 on light surfaces; on [data-surface=dark] the token
 * switches to red/300. Give it an id and reference it from the field's aria-describedby.
 */
function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      className={cn(
        "flex items-start gap-1.5 text-[13px] leading-[1.4] text-text-error",
        className,
      )}
      {...props}
    >
      <CircleAlert
        className="mt-px size-4 shrink-0"
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}

export { FieldError };
