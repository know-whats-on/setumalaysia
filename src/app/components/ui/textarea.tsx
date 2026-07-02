import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground outline-none transition-[background-color,border-color,box-shadow,color] duration-150 placeholder:text-muted-foreground/75 focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
