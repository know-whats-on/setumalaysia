import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium tracking-[0] outline-none transition-[background-color,border-color,color,opacity,transform] duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-[2px] focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90 active:translate-y-px",
        destructive:
          "border-destructive/55 bg-transparent text-destructive-foreground hover:border-destructive hover:bg-destructive/18 active:translate-y-px",
        outline:
          "border-border bg-transparent text-foreground hover:border-foreground/30 hover:bg-muted/70 active:translate-y-px",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-muted active:translate-y-px",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground active:translate-y-px",
        link: "border-transparent bg-transparent text-foreground underline-offset-4 hover:text-primary hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-5 has-[>svg]:px-4",
        icon: "size-9 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({
  className,
  variant,
  size,
  asChild = false,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
