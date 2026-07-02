import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-150 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/10 text-primary [a&]:hover:bg-primary/15",
        secondary:
          "border-border bg-secondary text-secondary-foreground [a&]:hover:bg-muted",
        destructive:
          "border-destructive/40 bg-destructive/12 text-destructive-foreground [a&]:hover:bg-destructive/18",
        outline:
          "border-border bg-transparent text-muted-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
