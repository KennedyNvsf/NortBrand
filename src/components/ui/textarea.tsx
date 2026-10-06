import * as React from "react";

import { fieldClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/*
 * Figma: 02 Components › Textarea (407:183). Same four states as Input; 120pt field and
 * the placeholder wraps.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClassName,
        "field-sizing-content min-h-[120px] resize-y py-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
