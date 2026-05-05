"use client";

import { useEffect, useState } from "react";

export type ExampleCardItem = {
  id: string;
  title: string;
  description: string | null;
  prompt: string | null;
  mediaUrl: string | null;
};

export function ExampleOutputGallery({ items }: { items: ExampleCardItem[] }) {
  const [active, setActive] = useState<ExampleCardItem | null>(null);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-gray-400">No examples yet</p>;
  }

  return (
    <>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition duration-200 hover:scale-105 hover:shadow-lg"
          >
            <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-gray-100">
              {item.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external sample URLs
                <img
                  src={item.mediaUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 px-4 text-center text-sm font-medium text-gray-600">
                  {item.title}
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              {item.description ? (
                <p className="line-clamp-2 text-sm text-gray-600">{item.description}</p>
              ) : null}
              {item.prompt ? (
                <p className="line-clamp-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
                  Prompt: "{item.prompt}"
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{active.title}</p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="bg-gray-100">
              {active.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external sample URLs
                <img
                  src={active.mediaUrl}
                  alt={active.title}
                  className="h-auto max-h-[78vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-[40vh] items-center justify-center text-sm text-gray-400">
                  No media link
                </div>
              )}
            </div>
            {(active.description || active.prompt) ? (
              <div className="border-t border-gray-200 p-4">
                {active.description ? (
                  <p className="text-sm text-gray-700">{active.description}</p>
                ) : null}
                {active.prompt ? (
                  <p className="mt-3 rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-600">
                    Prompt: "{active.prompt}"
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
