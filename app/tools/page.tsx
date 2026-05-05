import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";

type ToolListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pricing_summary: string | null;
  difficulty_summary: string | null;
  logo_url: string | null;
};

function pricingTone(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  if (raw === "free") return "free" as const;
  if (raw === "freemium") return "freemium" as const;
  if (raw === "paid") return "paid" as const;
  if (raw === "credits") return "credits" as const;
  return "neutral" as const;
}

function difficultyTone(summary: string | null | undefined) {
  const raw = (summary ?? "").trim().toLowerCase();
  if (raw.includes("very easy")) return "very-easy" as const;
  if (raw.startsWith("easy")) return "easy" as const;
  if (raw.startsWith("medium")) return "medium" as const;
  if (raw.startsWith("hard")) return "hard" as const;
  return "neutral" as const;
}

export default async function ToolsIndexPage() {
  const { data: tools, error } = await supabase
    .from("tools")
    .select("id, name, slug, description, pricing_summary, difficulty_summary, logo_url")
    .order("name", { ascending: true });

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

  const list = (tools ?? []) as ToolListItem[];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-8 p-8">
        <Link
          href="/"
          className="text-sm text-gray-500 underline-offset-4 hover:text-indigo-600 hover:underline"
        >
          ← Home
        </Link>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Tool-first view</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">All Tools</h1>
          </div>
          <p className="text-sm text-gray-500">{list.length} tools</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((tool) => (
            <Link key={tool.id} href={`/tools/${tool.slug}`} className="block">
              <Card className="h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="size-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white">
                      {tool.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote logo URLs
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
                    <h2 className="truncate text-lg font-semibold text-gray-900">{tool.name}</h2>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {tool.description?.trim() || "No description yet."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="pricing" tone={pricingTone(tool.pricing_summary)}>
                    {tool.pricing_summary || "Unknown"}
                  </Badge>
                  <Badge variant="difficulty" tone={difficultyTone(tool.difficulty_summary)}>
                    {tool.difficulty_summary || "Unknown"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
