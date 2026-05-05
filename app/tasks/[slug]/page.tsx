import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryLabel } from "../../../lib/category-label";
import { supabase } from "../../../lib/supabase";
import type { FilterableAttributeDef, ToolForFilter } from "@/lib/tool-attribute-filters";
import { buildFilterOptionsByAttribute } from "@/lib/tool-attribute-filters";
import {
  TaskToolsPanel,
  type VisibleTableColumn,
} from "./task-tools-panel";

type TaskToolRow = {
  tools: ToolForFilter | null;
};

type CategoryRow = {
  name: string;
  slug: string;
};

type TaskDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categories: CategoryRow | null;
  task_tools: TaskToolRow[] | null;
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [
    { data: task, error: taskError },
    { data: visibleDefsRaw, error: visibleAttrError },
    { data: filterableDefsRaw, error: filterableAttrError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `
      id,
      name,
      slug,
      description,
      categories (
        name,
        slug
      ),
      task_tools (
        tools (
          id,
          name,
          slug,
          description,
          pricing_summary,
          difficulty_summary,
          website_url,
          logo_url,
          tool_attribute_values (
            display_value,
            attribute_id,
            value_json
          )
        )
      )
    `,
      )
      .eq("slug", slug)
      .maybeSingle<TaskDetail>(),
    supabase
      .from("attribute_definitions")
      .select("id, name, data_type, display_order")
      .eq("is_visible_in_table", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("attribute_definitions")
      .select("id, name, data_type, display_order")
      .eq("is_filterable", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
  ]);

  const queryError = taskError ?? visibleAttrError ?? filterableAttrError;
  if (queryError) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Supabase Error</h1>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">
          {queryError.message}
        </pre>
      </main>
    );
  }

  if (!task) {
    notFound();
  }

  const tools =
    task.task_tools
      ?.map((row) => row.tools)
      .filter((t): t is ToolForFilter => t != null) ?? [];

  const visibleColumns: VisibleTableColumn[] = (visibleDefsRaw ?? [])
    .map((row) => ({
      id: row.id,
      name: row.name,
      display_order: row.display_order,
      data_type: row.data_type ?? "",
    }))
    .filter(
      (col) => col.name.trim().toLowerCase() !== "beginner friendly",
    );
  const filterableAttributes: FilterableAttributeDef[] = (
    filterableDefsRaw ?? []
  ).map((row) => ({
    id: row.id,
    name: row.name,
    display_order: row.display_order,
    data_type: row.data_type as FilterableAttributeDef["data_type"],
  }));

  const filterOptionsByAttributeId = buildFilterOptionsByAttribute(
    tools,
    filterableAttributes,
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-8">
      <Link
        href="/"
        className="text-sm text-gray-500 underline-offset-4 hover:text-indigo-600 hover:underline"
      >
        ← All tasks
      </Link>

      <p className="mt-8 text-xs font-medium uppercase tracking-wide text-gray-500">
        {categoryLabel(task.categories)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
        {task.name}
      </h1>
      {task.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600">
          {task.description}
        </p>
      ) : null}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-gray-900">Tools</h2>
        {tools.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No tools linked yet.</p>
        ) : (
          <TaskToolsPanel
            tools={tools}
            visibleColumns={visibleColumns}
            filterableAttributes={filterableAttributes}
            filterOptionsByAttributeId={filterOptionsByAttributeId}
            currentTaskSlug={task.slug}
          />
        )}
      </section>
      </div>
    </main>
  );
}
