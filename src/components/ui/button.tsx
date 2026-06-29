import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-focus",
  secondary:
    "border border-hairline bg-surface-1 text-ink hover:border-hairline-strong hover:bg-surface-2",
  tertiary: "bg-canvas text-ink hover:bg-surface-1",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 py-2 text-sm",
  md: "min-h-10 px-3.5 py-2 text-sm",
};

export function Button({
  children,
  className = "",
  size = "md",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "focus-ring inline-flex items-center justify-center gap-2 rounded-md font-medium leading-none transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        "disabled:cursor-not-allowed disabled:border-hairline disabled:bg-surface-2 disabled:text-ink-tertiary disabled:hover:bg-surface-2",
        className,
      ].join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
