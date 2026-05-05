"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "../../../lib/supabase";
import { trackToolEvent } from "@/lib/track-tool-event";
import { ExampleOutputGallery, type ExampleCardItem } from "./example-output-gallery";

type ToolRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website_url: string;
  logo_url: string | null;
  pricing_summary: string | null;
  difficulty_summary: string | null;
  has_api: boolean | null;
  try_enabled: boolean | null;
  api_provider: string | null;
};

type AttributeValueRow = {
  display_value: string;
  value_json: unknown;
  attribute_definitions:
    | { name: string; data_type: string | null; display_order: number | null }
    | { name: string; data_type: string | null; display_order: number | null }[]
    | null;
};
type NormalizedAttributeValueRow = {
  display_value: string;
  value_json: unknown;
  attribute_definitions: { name: string; data_type: string | null; display_order: number | null } | null;
};

type TaskJoinRow = {
  tasks:
    | { id: string; slug: string; name: string }
    | { id: string; slug: string; name: string }[]
    | null;
};

type ToolExampleRow = {
  id?: string;
  title?: string | null;
  name?: string | null;
  prompt?: string | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  output_url?: string | null;
};
type PreviewResult =
  | { kind: "image"; title: string; imageUrl: string }
  | { kind: "text"; title: string; text: string };

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function pickExampleMediaUrl(example: ToolExampleRow): string | null {
  const candidates = [example.image_url, example.thumbnail_url, example.output_url];
  for (const item of candidates) {
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
  }
  return null;
}

function normalizeYesNo(value: string | undefined): "Yes" | "No" | "—" {
  const d = (value ?? "").trim().toLowerCase();
  if (d === "yes" || d.startsWith("yes")) return "Yes";
  if (d === "no" || d.startsWith("no")) return "No";
  return "—";
}

function boolBadge(value: "Yes" | "No" | "—") {
  if (value === "Yes") return <Badge variant="boolean" tone="yes">Yes</Badge>;
  if (value === "No") return <Badge variant="boolean" tone="no">No</Badge>;
  return <span className="text-sm text-gray-400">—</span>;
}

function pricingBadge(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  const label = summary?.trim() || "—";
  const tone =
    raw === "free"
      ? "free"
      : raw === "freemium"
        ? "freemium"
        : raw === "paid"
          ? "paid"
          : raw === "credits"
            ? "credits"
            : "neutral";
  return <Badge variant="pricing" tone={tone}>{label}</Badge>;
}

function difficultyBadge(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  const tone = raw.includes("very easy")
    ? "very-easy"
    : raw.startsWith("easy")
      ? "easy"
      : raw.startsWith("medium")
        ? "medium"
        : raw.startsWith("hard")
          ? "hard"
          : "neutral";
  return <Badge variant="difficulty" tone={tone}>{summary?.trim() || "—"}</Badge>;
}

function useCaseIcon(taskName: string): string {
  const n = taskName.toLowerCase();
  if (n.includes("thumbnail")) return "🖼️";
  if (n.includes("blog") || n.includes("writing")) return "✍️";
  if (n.includes("image")) return "🎨";
  if (n.includes("video")) return "🎬";
  if (n.includes("ad")) return "📣";
  return "✨";
}

export default function ToolDetailClient({
  slug,
  fromTask,
  from,
}: {
  slug: string;
  fromTask?: string;
  from?: string;
}) {
  const trackedViewToolIdRef = useRef<string | null>(null);
  const trySectionRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolRow | null>(null);
  const [isTryExpanded, setIsTryExpanded] = useState(false);
  const [tryPrompt, setTryPrompt] = useState("");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [attributes, setAttributes] = useState<NormalizedAttributeValueRow[]>([]);
  const [supportedTasks, setSupportedTasks] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [exampleCards, setExampleCards] = useState<ExampleCardItem[]>([]);
  const [fromTaskRow, setFromTaskRow] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);

      const { data: toolData, error: toolError } = await supabase
        .from("tools")
        .select("id, slug, name, description, website_url, logo_url, pricing_summary, difficulty_summary, has_api, try_enabled, api_provider")
        .eq("slug", slug)
        .maybeSingle<ToolRow>();

      if (cancelled) return;
      if (toolError) {
        setError(toolError.message);
        setLoading(false);
        return;
      }
      if (!toolData) {
        setTool(null);
        setLoading(false);
        return;
      }

      const [attrRes, taskRes, exampleRes, fromTaskRes] = await Promise.all([
        supabase
          .from("tool_attribute_values")
          .select(`
            display_value,
            value_json,
            attribute_definitions (
              name,
              data_type,
              display_order
            )
          `)
          .eq("tool_id", toolData.id),
        supabase
          .from("task_tools")
          .select(`
            tasks (
              id,
              slug,
              name
            )
          `)
          .eq("tool_id", toolData.id),
        supabase
          .from("tool_examples")
          .select("id, title, name, prompt, description, image_url, thumbnail_url, output_url")
          .eq("tool_id", toolData.id)
          .order("created_at", { ascending: false })
          .limit(8),
        fromTask
          ? supabase.from("tasks").select("slug, name").eq("slug", fromTask).maybeSingle<{ slug: string; name: string }>()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;
      if (attrRes.error || taskRes.error) {
        setError(attrRes.error?.message ?? taskRes.error?.message ?? "Unknown error");
        setLoading(false);
        return;
      }

      const normalizedAttributes: NormalizedAttributeValueRow[] = ((attrRes.data ?? []) as unknown as AttributeValueRow[])
        .map((row) => {
          const raw = row.attribute_definitions;
          const normalized = Array.isArray(raw) ? raw[0] ?? null : raw;
          return { ...row, attribute_definitions: normalized };
        })
        .filter((row) => row.attribute_definitions?.name)
        .sort((a, b) => {
          const ao = a.attribute_definitions?.display_order ?? 9999;
          const bo = b.attribute_definitions?.display_order ?? 9999;
          if (ao !== bo) return ao - bo;
          return (a.attribute_definitions?.name ?? "").localeCompare(b.attribute_definitions?.name ?? "");
        });

      const normalizedTasks = ((taskRes.data ?? []) as unknown as TaskJoinRow[])
        .flatMap((row) => {
          if (!row.tasks) return [];
          return Array.isArray(row.tasks) ? row.tasks : [row.tasks];
        })
        .filter((task) => task && typeof task.slug === "string");

      const examples: ToolExampleRow[] = exampleRes.error ? [] : ((exampleRes.data ?? []) as ToolExampleRow[]);
      const cards: ExampleCardItem[] = examples.map((example, idx) => ({
        id: example.id ?? `example-${idx}`,
        title: example.title?.trim() || example.name?.trim() || `Example ${idx + 1}`,
        description: example.description?.trim() || null,
        prompt: example.prompt?.trim() || null,
        mediaUrl: pickExampleMediaUrl(example),
      }));

      setTool(toolData);
      setAttributes(normalizedAttributes);
      setSupportedTasks(normalizedTasks);
      setExampleCards(cards);
      setFromTaskRow(fromTaskRes.data ?? null);
      setLoading(false);
    }

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [slug, fromTask]);

  useEffect(() => {
    if (!tool?.id) return;
    if (trackedViewToolIdRef.current === tool.id) return;

    trackedViewToolIdRef.current = tool.id;
    void trackToolEvent({
      toolId: tool.id,
      eventType: "view_tool",
      metadata: {
        slug: tool.slug,
        fromTask: fromTask ?? null,
        from: from ?? null,
      },
    });
  }, [tool?.id, tool?.slug, fromTask, from]);

  const derived = useMemo(() => {
    const freePlanValue = normalizeYesNo(
      attributes.find((row) => row.attribute_definitions?.name.trim().toLowerCase() === "free plan")?.display_value,
    );
    const apiSupportValue = normalizeYesNo(
      attributes.find((row) => row.attribute_definitions?.name.trim().toLowerCase() === "api support")?.display_value,
    );
    const outputTypeAttr = attributes.find((row) => row.attribute_definitions?.name.trim().toLowerCase() === "output type");
    const outputTypes = Array.isArray(outputTypeAttr?.value_json)
      ? outputTypeAttr.value_json.map((v) => String(v).trim()).filter(Boolean)
      : typeof outputTypeAttr?.display_value === "string"
        ? outputTypeAttr.display_value.split(",").map((v) => v.trim()).filter(Boolean)
        : [];
    const commercialUseAttr = attributes.find(
      (row) => row.attribute_definitions?.name.trim().toLowerCase() === "commercial use",
    );
    const commercialRaw = (
      typeof commercialUseAttr?.value_json === "string"
        ? commercialUseAttr.value_json
        : commercialUseAttr?.display_value ?? ""
    )
      .toString()
      .toLowerCase();
    const commercialLabel = commercialRaw.includes("allow")
      ? "Allowed"
      : commercialRaw.includes("restrict") || commercialRaw.includes("no commercial")
        ? "Restricted"
        : commercialRaw
          ? "Depends"
          : "—";
    return { freePlanValue, apiSupportValue, outputTypes, commercialLabel };
  }, [attributes]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl space-y-10 p-8">
          <Skeleton className="h-4 w-28" />
          <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-8 w-72" />
                  <Skeleton className="h-4 w-full max-w-[36rem]" />
                  <Skeleton className="h-4 w-full max-w-[30rem]" />
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 whitespace-nowrap md:ml-auto md:w-auto md:flex-row md:justify-end">
                <Skeleton className="h-10 w-full md:w-56" />
                <Skeleton className="h-10 w-full md:w-40" />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error}</pre>
      </main>
    );
  }

  if (!tool) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tool not found</h1>
      </main>
    );
  }

  const logoSrc = tool.logo_url?.trim() || null;
  const initial = tool.name.trim().charAt(0).toUpperCase() || "?";
  const backHref = fromTaskRow?.slug ? `/tasks/${fromTaskRow.slug}` : from === "radar" ? "/radar" : "/";
  const resolvedBackLabel = fromTaskRow?.name
    ? `← ${fromTaskRow.name}`
    : from === "radar"
      ? "← Tool Radar"
      : "← Home";
  const compareTaskSlug = fromTaskRow?.slug ?? supportedTasks[0]?.slug ?? null;
  const compareHref = compareTaskSlug ? `/tasks/${compareTaskSlug}` : "/";
  const bestForSummary = `Best for: ${tool.difficulty_summary?.trim() || "easy adoption"} with ${tool.pricing_summary?.trim() || "flexible"} pricing.`;
  const canTry = Boolean(tool.try_enabled);

  async function handleGeneratePreview() {
    if (!tool) return;
    setIsGeneratingPreview(true);
    setPreviewResult(null);
    try {
      await trackToolEvent({
        toolId: tool.id,
        eventType: "click_try",
        metadata: {
          slug: tool.slug,
          action: "generate_preview",
          promptLength: tryPrompt.trim().length,
        },
      });
    } catch {
      // keep UI resilient
    }

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1000);
      });

      await trackToolEvent({
        toolId: tool.id,
        eventType: "generate",
        metadata: {
          slug: tool.slug,
          promptLength: tryPrompt.trim().length,
          simulated: true,
        },
      });
    } catch {
      // keep UI resilient
    } finally {
      const normalizedPrompt = tryPrompt.trim();
      const looksLikeImageRequest =
        derived.outputTypes.some((x) => x.toLowerCase().includes("image")) ||
        derived.outputTypes.some((x) => x.toLowerCase().includes("design")) ||
        derived.outputTypes.some((x) => x.toLowerCase().includes("vector")) ||
        normalizedPrompt.toLowerCase().includes("image");

      if (looksLikeImageRequest) {
        const imageLabel = normalizedPrompt
          ? encodeURIComponent(normalizedPrompt.slice(0, 42))
          : encodeURIComponent(`${tool.name} Preview`);
        setPreviewResult({
          kind: "image",
          title: "Simulated result",
          imageUrl: `https://placehold.co/960x540/e5e7eb/475569?text=${imageLabel}`,
        });
      } else {
        setPreviewResult({
          kind: "text",
          title: "Simulated result",
          text: normalizedPrompt
            ? `This is a simulated text output for: "${normalizedPrompt.slice(0, 200)}${normalizedPrompt.length > 200 ? "..." : ""}"`
            : "This is a simulated text output. Enter a prompt to see a more specific preview.",
        });
      }
      setIsGeneratingPreview(false);
    }
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(tryPrompt);
    } catch {
      // noop
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-10 p-8">
        <Link href={backHref} className="inline-block text-sm text-gray-500 underline-offset-4 hover:text-indigo-600 hover:underline">
          {resolvedBackLabel}
        </Link>

        <Card className="p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoSrc} alt="" width={64} height={64} className="size-16 object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center text-lg font-semibold text-gray-600">{initial}</div>
                )}
              </div>
              <div className="min-w-0 flex-1 max-w-3xl">
                <h1 className="text-3xl font-semibold text-gray-900">{tool.name}</h1>
                <p className="mt-3 line-clamp-3 max-w-[600px] text-sm leading-relaxed text-gray-600">{tool.description?.trim() || "No description yet."}</p>
                <p className="mt-3 text-sm font-medium text-gray-700">{bestForSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pricingBadge(tool.pricing_summary)}
                  {difficultyBadge(tool.difficulty_summary)}
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 whitespace-nowrap md:ml-auto md:w-auto md:flex-row md:justify-end">
              <Link href={compareHref} className="inline-flex h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:border-gray-300 hover:bg-gray-50 md:w-auto">
                <span>Compare with other tools</span>
                <span aria-hidden>→</span>
              </Link>
              {canTry ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsTryExpanded(true);
                    void trackToolEvent({
                      toolId: tool.id,
                      eventType: "click_try",
                      metadata: {
                        slug: tool.slug,
                        action: "hero_scroll_to_try",
                      },
                    });
                    window.setTimeout(() => {
                      trySectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 0);
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition duration-200 hover:border-indigo-300 hover:bg-indigo-100 md:w-auto"
                >
                  <span>Try it</span>
                  <span aria-hidden>↘</span>
                </button>
              ) : null}
              <a
                href={tool.website_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void trackToolEvent({
                    toolId: tool.id,
                    eventType: "visit_tool",
                    metadata: {
                      slug: tool.slug,
                      websiteUrl: tool.website_url,
                    },
                  });
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-indigo-700 md:w-auto"
              >
                <span>Visit website</span>
                <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pricing</p>
              <div className="mt-1">{pricingBadge(tool.pricing_summary)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Difficulty</p>
              <div className="mt-1">{difficultyBadge(tool.difficulty_summary)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Free Plan</p>
              <div className="mt-1">{boolBadge(derived.freePlanValue)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">API Support</p>
              <div className="mt-1">{boolBadge(derived.apiSupportValue)}</div>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs uppercase tracking-wide text-gray-500">Key Attributes</p>
            {attributes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {derived.outputTypes.map((item) => (
                  <Badge key={`output-${item}`} variant="output" tone={item.toLowerCase().includes("video") || item.toLowerCase().includes("motion") ? "video" : item.toLowerCase().includes("vector") ? "vector" : item.toLowerCase().includes("design") ? "design" : item.toLowerCase().includes("image") || item.toLowerCase().includes("raster") ? "image" : "neutral"}>
                    {item}
                  </Badge>
                ))}
                <Badge variant="commercial" tone={derived.commercialLabel === "Allowed" ? "allowed" : derived.commercialLabel === "Depends" ? "depends" : derived.commercialLabel === "Restricted" ? "restricted" : "neutral"}>
                  {derived.commercialLabel}
                </Badge>
                {attributes.map((row) =>
                  row.attribute_definitions?.name.trim().toLowerCase() === "output type" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "commercial use" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "free plan" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "api support" ? null : (
                    <Badge key={`${row.attribute_definitions?.name}-${row.display_value}`} variant="commercial" tone="neutral" className="border border-gray-200 bg-gray-50 text-gray-700">
                      {row.attribute_definitions?.name}: {row.display_value || "—"}
                    </Badge>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No attributes yet.</p>
            )}
          </div>

          <div className="mt-7">
            <p className="text-xs uppercase tracking-wide text-gray-500">Supported Use Cases</p>
            {supportedTasks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {supportedTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.slug}`} prefetch={true} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition duration-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                    <span aria-hidden>{useCaseIcon(task.name)}</span>
                    <span>{task.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No tasks linked yet.</p>
            )}
          </div>
        </Card>

        {canTry ? (
          <section ref={trySectionRef} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => {
                const nextExpanded = !isTryExpanded;
                setIsTryExpanded(nextExpanded);
                if (nextExpanded) {
                  void trackToolEvent({
                    toolId: tool.id,
                    eventType: "click_try",
                    metadata: {
                      slug: tool.slug,
                      action: "expand_try_section",
                    },
                  });
                }
              }}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Try this tool</h2>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    Simulated result
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Generate a simulated preview using a similar prompt experience.
                </p>
              </div>
              <span className="mt-1 text-sm text-gray-500" aria-hidden>
                {isTryExpanded ? "▼" : "▶"}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ${
                isTryExpanded ? "mt-5 max-h-[900px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div>
                <label htmlFor="try-prompt" className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Prompt
                </label>
                <textarea
                  id="try-prompt"
                  value={tryPrompt}
                  onChange={(e) => setTryPrompt(e.target.value)}
                  rows={5}
                  placeholder="Describe the output you want to generate..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isGeneratingPreview ? "Generating..." : "Generate preview"}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Copy prompt
                </button>
                <a
                  href={tool.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    void trackToolEvent({
                      toolId: tool.id,
                      eventType: "visit_tool",
                      metadata: {
                        slug: tool.slug,
                        source: "try_section",
                        websiteUrl: tool.website_url,
                      },
                    });
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Visit website
                </a>
              </div>

              {previewResult ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <div className="flex items-center justify-between border-b border-indigo-100 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                      {previewResult.title}
                    </p>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                      Simulated result
                    </span>
                  </div>
                  {previewResult.kind === "image" ? (
                    <div className="p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewResult.imageUrl}
                        alt="Simulated result"
                        className="aspect-video w-full rounded-lg border border-indigo-100 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-3">
                      <p className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm text-gray-700">
                        {previewResult.text}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Example Outputs</h2>
          <ExampleOutputGallery items={exampleCards} />
        </Card>
      </div>
    </main>
  );
}
