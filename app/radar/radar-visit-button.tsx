"use client";

export default function RadarVisitButton({
  url,
  label = "Visit website",
  className,
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      className={className}
    >
      {label}
    </button>
  );
}
