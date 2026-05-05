import type { HTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type BadgeVariant = "pricing" | "difficulty" | "boolean" | "output" | "commercial";

type BadgeTone =
  | "free"
  | "freemium"
  | "paid"
  | "credits"
  | "very-easy"
  | "easy"
  | "medium"
  | "hard"
  | "yes"
  | "no"
  | "image"
  | "video"
  | "vector"
  | "design"
  | "allowed"
  | "depends"
  | "restricted"
  | "neutral";

const VARIANT_TONES: Record<BadgeVariant, Partial<Record<BadgeTone, string>>> = {
  pricing: {
    free: "bg-green-100 text-green-700",
    freemium: "bg-indigo-100 text-indigo-700",
    paid: "bg-zinc-800 text-white",
    credits: "bg-purple-100 text-purple-700",
    neutral: "bg-gray-100 text-gray-600",
  },
  difficulty: {
    "very-easy": "bg-green-100 text-green-800",
    easy: "bg-indigo-100 text-indigo-800",
    medium: "bg-amber-100 text-amber-900",
    hard: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-600",
  },
  boolean: {
    yes: "bg-indigo-100 text-indigo-700",
    no: "bg-gray-100 text-gray-500",
    neutral: "bg-gray-100 text-gray-600",
  },
  output: {
    image: "border border-indigo-200 bg-indigo-50 text-indigo-700",
    video: "border border-purple-200 bg-purple-50 text-purple-700",
    vector: "border border-orange-200 bg-orange-50 text-orange-700",
    design: "border border-pink-200 bg-pink-50 text-pink-700",
    neutral: "border border-gray-200 bg-gray-50 text-gray-600",
  },
  commercial: {
    allowed: "bg-green-100 text-green-700",
    depends: "bg-yellow-100 text-yellow-700",
    restricted: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-600",
  },
};

export function Badge({
  variant,
  tone = "neutral",
  className,
  children,
  ...props
}: {
  variant: BadgeVariant;
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  const toneClass = VARIANT_TONES[variant][tone] ?? VARIANT_TONES[variant].neutral;
  return (
    <span
      {...props}
      className={cx(
        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
