import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-subhead font-semibold ring-offset-background transition-[opacity,transform,background-color] active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        // iOS "tinted" button: tint-coloured label on a translucent tint fill
        tinted: "bg-primary/15 text-primary",
        // iOS "plain" button: just tint-coloured text
        plain: "text-primary",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "bg-secondary text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        ghost: "text-foreground active:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 rounded-full px-3.5",
        // iOS large button: 50pt tall, 14pt corners, 17pt semibold
        lg: "h-[50px] rounded-[14px] px-6 text-headline [&_svg]:size-5",
        xl: "h-[50px] rounded-[14px] px-6 text-headline [&_svg]:size-5",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
