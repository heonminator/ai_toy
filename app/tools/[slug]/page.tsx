import ToolDetailClient from "./tool-detail-client";

export const revalidate = 60;

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
  const fromRaw = resolvedSearchParams.from;
  const fromTask =
    typeof fromTaskRaw === "string"
      ? fromTaskRaw
      : Array.isArray(fromTaskRaw)
        ? fromTaskRaw[0]
        : undefined;
  const from =
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw)
        ? fromRaw[0]
        : undefined;

  return <ToolDetailClient slug={slug} fromTask={fromTask} from={from} />;
}
