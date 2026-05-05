import Link from "next/link";
import { Badge } from "../components/ui/badge";
import { buttonClasses } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { categoryLabel } from "../lib/category-label";
import { supabase } from "../lib/supabase";

type PreviewTool = {
  id: string;
  slug: string;
  name: string;
  pricing_summary: string | null;
  difficulty_summary: string | null;
  website_url: string;
  logo_url: string | null;
};

type TaskToolPreviewRow = {
  tool_id: string;
  tools: PreviewTool | PreviewTool[] | null;
};

type HomeTaskCard = {
  id: string;
  name: string;
  slug: string;
  categoryLabel: string;
  description: string | null;
};

export default async function Home() {
  const [{ data: tasks, error }, { data: taskToolRows }] = await Promise.all([
    supabase.from("tasks").select(`
      id,
      name,
      slug,
      description,
      display_order,
      categories (
        name,
        slug
      )
    `)
      // .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("task_tools")
      .select(
        `
        tool_id,
        tools (
          id,
          slug,
          name,
          pricing_summary,
          difficulty_summary,
          website_url,
          logo_url
        )
      `,
      )
      .limit(60),
  ]);
  const previewTools = (taskToolRows ?? [])
    .flatMap((row) => {
      const typed = row as unknown as TaskToolPreviewRow;
      if (!typed.tools) return [];
      return Array.isArray(typed.tools) ? typed.tools : [typed.tools];
    })
    .slice(0, 6);
  const taskCards: HomeTaskCard[] = (tasks ?? []).map((task) => ({
    id: task.id,
    name: task.name,
    slug: task.slug,
    categoryLabel: categoryLabel(task.categories) ?? "General",
    description: task.description,
  }));
  const fallbackTaskCards: HomeTaskCard[] = [
    {
      id: "dummy-thumbnail",
      name: "Thumbnail Generation",
      slug: "thumbnail-generation",
      categoryLabel: "Content Creation",
      description: "Compare tools for high-converting thumbnails.",
    },
    {
      id: "dummy-blog-writing",
      name: "Blog Writing",
      slug: "blog-writing",
      categoryLabel: "Writing",
      description: "Find the fastest workflow for long-form blog drafts.",
    },
    {
      id: "dummy-image-generation",
      name: "Image Generation",
      slug: "image-generation",
      categoryLabel: "Creative",
      description: "Evaluate image quality, style range, and speed.",
    },
    {
      id: "dummy-video-creation",
      name: "Video Creation",
      slug: "video-creation",
      categoryLabel: "Video",
      description: "Compare tools for short-form and cinematic outputs.",
    },
    {
      id: "dummy-social-ad-copy",
      name: "Social Ad Copy",
      slug: "social-ad-copy",
      categoryLabel: "Marketing",
      description: "Pick tools for ad hooks, CTA variants, and iteration.",
    },
    {
      id: "dummy-landing-page-copy",
      name: "Landing Page Copy",
      slug: "landing-page-copy",
      categoryLabel: "Growth",
      description: "Compare conversion-focused writing assistants.",
    },
  ];
  const displayTaskCards = [...taskCards];
  for (const fallback of fallbackTaskCards) {
    if (displayTaskCards.length >= 6) break;
    if (!displayTaskCards.some((x) => x.slug === fallback.slug)) {
      displayTaskCards.push(fallback);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-10 px-8 py-10">
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-10 shadow-sm">
          <Badge variant="boolean" tone="yes">Compare AI Tools</Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-gray-900">
            Find the best AI tools for your task — instantly.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-gray-600">
            Compare tools side by side, save time, and choose the best stack with confidence.
          </p>

          <div className="mt-6">
            <div className="relative max-w-xl">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg viewBox="0 0 20 20" fill="none" className="size-4">
                  <path
                    d="m14.5 14.5 3.5 3.5m-1.5-8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                placeholder="Start with a task or tool name..."
                className="h-12 w-full rounded-lg border border-indigo-200 bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              "Thumbnail Generation",
              "Blog Writing",
              "Image Generation",
              "Video Creation",
            ].map((label) => (
              <button
                key={label}
                type="button"
                className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Explore Tasks</h2>
            <p className="text-xs uppercase tracking-wide text-gray-500">Task-first view</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayTaskCards.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.slug}`}
                className="block"
              >
                <Card className="h-full p-5 transition duration-200 hover:scale-[1.01] hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {task.categoryLabel}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">{task.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {task.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Popular Tools Preview</h2>
              <p className="mt-1 text-sm text-gray-600">
                Most popular AI tools across tasks
              </p>
            </div>
            <Link
              href="/tools"
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              Open full comparison
            </Link>
          </div>
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {previewTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="group relative rounded-xl border border-gray-200 bg-gray-50 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <Link
                      href={`/tools/${tool.slug}?from=home`}
                      aria-label={`Open ${tool.name} detail`}
                      className="absolute inset-0 rounded-xl"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <div className="size-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
                          {tool.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote logo URL
                            <img
                              src={tool.logo_url}
                              alt=""
                              width={32}
                              height={32}
                              className="size-8 object-cover"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center text-xs font-semibold text-gray-500">
                              {tool.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                          {tool.name}
                        </p>
                      </div>
                      <Badge variant="pricing" tone={
                        tool.pricing_summary?.toLowerCase().trim() === "free"
                          ? "free"
                          : tool.pricing_summary?.toLowerCase().trim() === "freemium"
                            ? "freemium"
                            : tool.pricing_summary?.toLowerCase().trim() === "paid"
                              ? "paid"
                              : tool.pricing_summary?.toLowerCase().trim() === "credits"
                                ? "credits"
                                : "neutral"
                      }>
                        {tool.pricing_summary ?? "Unknown"}
                      </Badge>
                    </div>
                    <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
                      <Badge variant="difficulty" tone={
                        tool.difficulty_summary?.toLowerCase().includes("very easy")
                          ? "very-easy"
                          : tool.difficulty_summary?.toLowerCase().startsWith("easy")
                            ? "easy"
                            : tool.difficulty_summary?.toLowerCase().startsWith("medium")
                              ? "medium"
                              : tool.difficulty_summary?.toLowerCase().startsWith("hard")
                                ? "hard"
                                : "neutral"
                      }>
                        {tool.difficulty_summary ?? "Unknown"}
                      </Badge>
                      <a
                        href={tool.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 opacity-70 transition duration-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:opacity-100"
                      >
                        Visit
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </section>

        <section className="mt-2">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Why</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg viewBox="0 0 20 20" fill="none" className="size-5">
                <path d="M3 5h14M3 10h14M3 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Compare tools visually</h3>
            <p className="mt-2 text-sm text-gray-600">
              Scan pricing, difficulty, capabilities, and fit in one comparison table.
            </p>
          </Card>
          <Card className="p-6">
            <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg viewBox="0 0 20 20" fill="none" className="size-5">
                <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Save time choosing</h3>
            <p className="mt-2 text-sm text-gray-600">
              Skip repetitive research and jump straight to best-fit options per task.
            </p>
          </Card>
          <Card className="p-6">
            <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg viewBox="0 0 20 20" fill="none" className="size-5">
                <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Understand differences instantly</h3>
            <p className="mt-2 text-sm text-gray-600">
              Spot trade-offs at a glance so decisions feel obvious, not overwhelming.
            </p>
          </Card>
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-200 bg-indigo-600 p-8 text-white shadow-sm">
          <h3 className="text-2xl font-semibold">Start your next workflow faster</h3>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">
            Browse tasks, compare tools, and move from exploration to execution quickly.
          </p>
          <div className="mt-5">
            <Link
              href={(tasks ?? [])[0] ? `/tasks/${tasks?.[0]?.slug}` : "/"}
              className={`inline-flex ${buttonClasses("secondary")} border-white bg-white text-indigo-700 hover:bg-indigo-50`}
            >
              Explore now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}