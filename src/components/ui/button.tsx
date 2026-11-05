import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "brand" | "outline" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85 disabled:bg-ink/40",
  brand: "bg-brand text-brand-contrast hover:bg-brand-strong disabled:bg-brand/40",
  outline: "border border-ink/80 bg-transparent text-ink hover:bg-ink hover:text-white disabled:opacity-40",
  ghost: "bg-transparent text-ink hover:bg-muted disabled:opacity-40",
  danger: "bg-danger text-white hover:bg-danger/85 disabled:opacity-40",
  soft: "bg-muted text-ink hover:bg-muted-strong disabled:opacity-40",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
  icon: "size-10 justify-center",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
