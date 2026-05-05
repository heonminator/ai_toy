import type { ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      {children}
    </section>
  );
}
