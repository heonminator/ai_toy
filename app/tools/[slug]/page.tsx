import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "../../../lib/supabase";
import {
  ExampleOutputGallery,
  type ExampleCardItem,
} from "./example-output-gallery";

export const revalidate = 60;

type ToolRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website_url: string;
  logo_url: string | null;
  pricing_summary: string | null;
  difficulty_summary: string | null;
};

type AttributeValueRow = {
  display_value: string;
  value_json: unknown;
  attribute_definitions:
    | {
        name: string;
        data_type: string | null;
        display_order: number | null;
      }
    | {
        name: string;
        data_type: string | null;
        display_order: number | null;
      }[]
    | null;
};

type TaskJoinRow = {
  tasks:
    | {
        id: string;
        slug: string;
        name: string;
      }
    | {
        id: string;
        slug: string;
        name: string;
      }[]
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
  created_at?: string | null;
};

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
  if (value === "Yes") {
    return <Badge variant="boolean" tone="yes">Yes</Badge>;
  }
  if (value === "No") {
    return <Badge variant="boolean" tone="no">No</Badge>;
  }
  return <span className="text-sm text-gray-400">—</span>;
}

function pricingBadge(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  const label = summary?.trim() || "—";
  const tone = raw === "free" ? "free" : raw === "freemium" ? "freemium" : raw === "paid" ? "paid" : raw === "credits" ? "credits" : "neutral";
  return <Badge variant="pricing" tone={tone}>{label}</Badge>;
}

function difficultyBadge(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  const tone = raw.includes("very easy") ? "very-easy" : raw.startsWith("easy") ? "easy" : raw.startsWith("medium") ? "medium" : raw.startsWith("hard") ? "hard" : "neutral";
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

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ fromTask?: string | string[]; from?: string | string[] }>;
}) {
  type ToolSearchParams = { fromTask?: string | string[]; from?: string | string[] };
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<ToolSearchParams>({}),
  ]);
  const fromTaskRaw = resolvedSearchParams.fromTask;
  const fromTask =
    typeof fromTaskRaw === "string"
      ? fromTaskRaw
      : Array.isArray(fromTaskRaw)
        ? fromTaskRaw[0]
        : undefined;
  const fromRaw = resolvedSearchParams.from;
  const from =
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw)
        ? fromRaw[0]
        : undefined;

  const { data: tool, error: toolError } = await supabase
    .from("tools")
    .select(
      "id, slug, name, description, website_url, logo_url, pricing_summary, difficulty_summary",
    )
    .eq("slug", slug)
    .maybeSingle<ToolRow>();

  if (toolError) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">
          {toolError.message}
        </pre>
      </main>
    );
  }

  if (!tool) notFound();

  const [
    { data: attributeRows, error: attributeError },
    { data: taskRows, error: taskError },
    { data: exampleRows, error: exampleError },
    { data: fromTaskRow },
  ] = await Promise.all([
    supabase
      .from("tool_attribute_values")
      .select(
        `
        display_value,
        value_json,
        attribute_definitions (
          name,
          data_type,
          display_order
        )
      `,
      )
      .eq("tool_id", tool.id),
    supabase
      .from("task_tools")
      .select(
        `
        tasks (
          id,
          slug,
          name
        )
      `,
      )
      .eq("tool_id", tool.id),
    supabase
      .from("tool_examples")
      .select("id, title, name, prompt, description, image_url, thumbnail_url, output_url")
      .eq("tool_id", tool.id)
      .order("created_at", { ascending: false })
      .limit(8),
    fromTask
      ? supabase
          .from("tasks")
          .select("slug, name")
          .eq("slug", fromTask)
          .maybeSingle<{ slug: string; name: string }>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (attributeError || taskError) {
    const message = attributeError?.message ?? taskError?.message ?? "Unknown error";
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">
          {message}
        </pre>
      </main>
    );
  }

  const attributes = ((attributeRows ?? []) as unknown as AttributeValueRow[])
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
      return (a.attribute_definitions?.name ?? "").localeCompare(
        b.attribute_definitions?.name ?? "",
      );
    });

  const freePlanValue = normalizeYesNo(
    attributes.find(
      (row) =>
        row.attribute_definitions?.name.trim().toLowerCase() === "free plan",
    )?.display_value,
  );
  const apiSupportValue = normalizeYesNo(
    attributes.find(
      (row) =>
        row.attribute_definitions?.name.trim().toLowerCase() === "api support",
    )?.display_value,
  );
  const outputTypeAttr = attributes.find(
    (row) => row.attribute_definitions?.name.trim().toLowerCase() === "output type",
  );
  const outputTypes = Array.isArray(outputTypeAttr?.value_json)
    ? outputTypeAttr.value_json.map((v) => String(v).trim()).filter(Boolean)
    : typeof outputTypeAttr?.display_value === "string"
      ? outputTypeAttr.display_value.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
  const commercialUseAttr = attributes.find(
    (row) =>
      row.attribute_definitions?.name.trim().toLowerCase() === "commercial use",
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
  const supportedTasks = ((taskRows ?? []) as unknown as TaskJoinRow[])
    .flatMap((row) => {
      if (!row.tasks) return [];
      return Array.isArray(row.tasks) ? row.tasks : [row.tasks];
    })
    .filter((task) => task && typeof task.slug === "string");

  const examples: ToolExampleRow[] = exampleError
    ? []
    : ((exampleRows ?? []) as ToolExampleRow[]);
  const exampleCards: ExampleCardItem[] = examples.map((example, idx) => ({
    id: example.id ?? `example-${idx}`,
    title: example.title?.trim() || example.name?.trim() || `Example ${idx + 1}`,
    description: example.description?.trim() || null,
    prompt: example.prompt?.trim() || null,
    mediaUrl: pickExampleMediaUrl(example),
  }));

  const logoSrc = tool.logo_url?.trim() || null;
  const initial = tool.name.trim().charAt(0).toUpperCase() || "?";
  const backHref = fromTaskRow?.slug ? `/tasks/${fromTaskRow.slug}` : "/";
  const backLabel =
    fromTaskRow?.name
      ? `← ${fromTaskRow.name}`
      : from === "home"
        ? "← Home"
        : "← Home";
  const compareTaskSlug = fromTaskRow?.slug ?? supportedTasks[0]?.slug ?? null;
  const compareHref = compareTaskSlug ? `/tasks/${compareTaskSlug}` : "/";
  const bestForSummary = `Best for: ${tool.difficulty_summary?.trim() || "easy adoption"} with ${tool.pricing_summary?.trim() || "flexible"} pricing.`;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-10 p-8">
        <Link
          href={backHref}
          className="inline-block text-sm text-gray-500 underline-offset-4 hover:text-indigo-600 hover:underline"
        >
          {backLabel}
        </Link>

        <Card className="p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote logo URL
                  <img
                    src={logoSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center text-lg font-semibold text-gray-600">
                    {initial}
                  </div>
                )}
              </div>
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-gray-900">{tool.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                  {tool.description?.trim() || "No description yet."}
                </p>
                <p className="mt-3 text-sm font-medium text-gray-700">{bestForSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pricingBadge(tool.pricing_summary)}
                  {difficultyBadge(tool.difficulty_summary)}
                </div>
              </div>
            </div>
            <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
              <Link
                href={compareHref}
                className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
              >
                <span>Compare with other tools</span>
                <span aria-hidden>→</span>
              </Link>
              <a
                href={tool.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
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
              <div className="mt-1">{boolBadge(freePlanValue)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                API Support
              </p>
              <div className="mt-1">{boolBadge(apiSupportValue)}</div>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Key Attributes
            </p>
            {attributes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2.5">
                <span
                  className="inline-flex items-center gap-1"
                >
                  <Badge
                    variant="boolean"
                    tone={freePlanValue === "Yes" ? "yes" : freePlanValue === "No" ? "no" : "neutral"}
                  >
                    {freePlanValue === "Yes" ? "✓" : freePlanValue === "No" ? "✕" : "•"} Free Plan
                  </Badge>
                </span>
                <span
                  className="inline-flex items-center gap-1"
                >
                  <Badge
                    variant="boolean"
                    tone={apiSupportValue === "Yes" ? "yes" : apiSupportValue === "No" ? "no" : "neutral"}
                  >
                    {apiSupportValue === "Yes" ? "✓" : apiSupportValue === "No" ? "✕" : "•"} API
                  </Badge>
                </span>
                {outputTypes.map((item) => (
                  <Badge
                    key={`output-${item}`}
                    variant="output"
                    tone={item.toLowerCase().includes("video") || item.toLowerCase().includes("motion") ? "video" : item.toLowerCase().includes("vector") ? "vector" : item.toLowerCase().includes("design") ? "design" : item.toLowerCase().includes("image") || item.toLowerCase().includes("raster") ? "image" : "neutral"}
                  >
                    {item}
                  </Badge>
                ))}
                <Badge
                  variant="commercial"
                  tone={commercialLabel === "Allowed" ? "allowed" : commercialLabel === "Depends" ? "depends" : commercialLabel === "Restricted" ? "restricted" : "neutral"}
                >
                  {commercialLabel}
                </Badge>
                {attributes.map((row) => (
                  row.attribute_definitions?.name.trim().toLowerCase() === "output type" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "commercial use" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "free plan" ||
                  row.attribute_definitions?.name.trim().toLowerCase() === "api support"
                    ? null
                    : (
                  <Badge
                    key={`${row.attribute_definitions?.name}-${row.display_value}`}
                    variant="commercial"
                    tone="neutral"
                    className="border border-gray-200 bg-gray-50 text-gray-700"
                  >
                    {row.attribute_definitions?.name}: {row.display_value || "—"}
                  </Badge>
                    )
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No attributes yet.</p>
            )}
          </div>

          <div className="mt-7">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Supported Use Cases
            </p>
            {supportedTasks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {supportedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.slug}`}
                    prefetch={true}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
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

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Example Outputs</h2>
          <ExampleOutputGallery items={exampleCards} />
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">User Feedback</h2>
            <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Coming soon
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Social Mentions</h2>
            <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Coming soon
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
