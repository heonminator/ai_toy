import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import RadarVisitButton from "./radar-visit-button";

export const revalidate = 60;

type ToolCandidate = {
  id: string;
  name: string;
  website_url: string | null;
  source: string | null;
  extracted_description: string | null;
  detected_tasks: unknown;
  total_score: number | null;
  status: string;
};
type ToolIndexRow = {
  slug: string;
  name: string;
};

function normalizeTasks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim()).filter(Boolean);
}

function trendLabel(score: number | null): string {
  if (typeof score !== "number") return "🚀 New";
  if (score >= 8.5) return "🔥 Trending";
  if (score >= 7) return "⭐ High potential";
  return "🚀 New";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function ToolRadarPage() {
  const [{ data, error }, { data: toolsData, error: toolsError }] = await Promise.all([
    supabase
      .from("tool_candidates")
      .select("id, name, website_url, source, extracted_description, detected_tasks, total_score, status")
      .eq("status", "approved")
      .order("total_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("tools")
      .select("slug, name"),
  ]);

  if (error || toolsError) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error?.message ?? toolsError?.message}</pre>
      </main>
    );
  }

  const candidates = (data ?? []) as ToolCandidate[];
  const indexedTools = (toolsData ?? []) as ToolIndexRow[];
  const toolSlugByName = new Map(
    indexedTools.map((tool) => [normalizeKey(tool.name), tool.slug]),
  );
  const knownSlugs = new Set(indexedTools.map((tool) => tool.slug));
  const matchedToolSlug = (candidate: ToolCandidate): string | null => {
    const byName = toolSlugByName.get(normalizeKey(candidate.name));
    if (byName) return byName;
    const candidateSlug = slugifyName(candidate.name);
    if (knownSlugs.has(candidateSlug)) return candidateSlug;
    return null;
  };
  const featured = candidates[0] ?? null;
  const gridCandidates = featured ? candidates.slice(1) : candidates;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
        <div>
          <Link
            href="/"
            className="inline-block text-sm text-gray-500 hover:text-gray-700"
          >
            ← Home
          </Link>
          <h1 className="mb-2 mt-6 text-3xl font-semibold tracking-tight text-gray-900">Tool Radar</h1>
          <p className="text-sm text-gray-600">New AI tools worth watching</p>
        </div>

        {candidates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-gray-600">No approved tool candidates yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {featured ? (
              <Card className="relative p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                {(() => {
                  const slug = matchedToolSlug(featured);
                  const href = slug
                    ? `/tools/${slug}?from=radar`
                    : featured.website_url ?? null;
                  if (!href) return null;
                  return (
                    <a
                      href={href}
                      target={slug ? undefined : "_blank"}
                      rel={slug ? undefined : "noopener noreferrer"}
                      className="absolute inset-0 z-0 rounded-xl"
                      aria-label={`Open ${featured.name}`}
                    />
                  );
                })()}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="commercial" tone="neutral">Featured Tool</Badge>
                  <Badge variant="output" tone="design">{trendLabel(featured.total_score)}</Badge>
                </div>
                <h2 className="relative z-10 mt-2 text-2xl font-semibold text-gray-900">{featured.name}</h2>
                <p className="relative z-10 mt-2 text-sm leading-relaxed text-gray-600">
                  {featured.extracted_description?.trim() || "No extracted description yet."}
                </p>
                <div className="relative z-10 mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Why it matters</p>
                  <p className="mt-1 text-sm text-indigo-900">
                    Strong signal across usefulness and momentum. A good candidate to test early before wider adoption.
                  </p>
                </div>
                <div className="relative z-10 mt-3 flex flex-wrap gap-2">
                  {normalizeTasks(featured.detected_tasks).slice(0, 2).map((task) => (
                    <Badge key={`${featured.id}-${task}`} variant="output" tone="design">
                      {task}
                    </Badge>
                  ))}
                </div>
                <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
                  {/* Reserved for future try_enabled support on tool_candidates. */}
                  {matchedToolSlug(featured) ? (
                    <Link
                      href={`/tools/${matchedToolSlug(featured)}?from=radar`}
                      className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      View details
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">
                      Coming soon
                    </span>
                  )}
                  {featured.website_url ? (
                    <RadarVisitButton
                      url={featured.website_url}
                      className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    />
                  ) : null}
                </div>
                <p className="relative z-10 mt-3 text-xs text-gray-500">Source: {featured.source?.trim() || "Unknown"}</p>
              </Card>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gridCandidates.map((candidate) => {
                const tasks = normalizeTasks(candidate.detected_tasks).slice(0, 2);
                const slug = matchedToolSlug(candidate);
                const cardHref = slug
                  ? `/tools/${slug}?from=radar`
                  : candidate.website_url ?? null;
                return (
                  <Card key={candidate.id} className="relative cursor-pointer p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    {cardHref ? (
                      <a
                        href={cardHref}
                        target={slug ? undefined : "_blank"}
                        rel={slug ? undefined : "noopener noreferrer"}
                        className="absolute inset-0 z-0 rounded-xl"
                        aria-label={`Open ${candidate.name}`}
                      />
                    ) : null}
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{candidate.name}</h3>
                      <Badge variant="output" tone="neutral">{trendLabel(candidate.total_score)}</Badge>
                    </div>
                    <p className="relative z-10 mt-1 line-clamp-1 text-sm text-gray-600">
                      {candidate.extracted_description?.trim() || "No extracted description yet."}
                    </p>
                    <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
                      {tasks.length > 0 ? (
                        tasks.map((task) => (
                          <Badge key={`${candidate.id}-${task}`} variant="output" tone="design">
                            {task}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="output" tone="neutral">No tasks</Badge>
                      )}
                    </div>
                    <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
                      {candidate.website_url ? (
                        <RadarVisitButton
                          url={candidate.website_url}
                          label="Visit"
                          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-400">
                          No website
                        </span>
                      )}
                      <p className="text-[11px] text-gray-500">Source: {candidate.source?.trim() || "Unknown"}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
