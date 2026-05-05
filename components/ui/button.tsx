import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function buttonClasses(variant: ButtonVariant) {
  if (variant === "primary") {
    return "border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500";
  }
  if (variant === "secondary") {
    return "border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600";
  }
  return "border border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100 hover:text-indigo-700";
}

export function Button({
  variant,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition",
        buttonClasses(variant),
        className,
      )}
    >
      {children}
    </button>
  );
}
