"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { categoryLabel } from "../../../lib/category-label";
import { supabase } from "../../../lib/supabase";
import type { FilterableAttributeDef, ToolForFilter } from "@/lib/tool-attribute-filters";
import { buildFilterOptionsByAttribute } from "@/lib/tool-attribute-filters";
import { TaskToolsPanel, type VisibleTableColumn } from "./task-tools-panel";

type TaskToolRow = { tools: ToolForFilter | null };
type CategoryRow = { name: string; slug: string };
type TaskDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categories: CategoryRow | null;
  task_tools: TaskToolRow[] | null;
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export default function TaskDetailClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [tools, setTools] = useState<ToolForFilter[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<VisibleTableColumn[]>([]);
  const [filterableAttributes, setFilterableAttributes] = useState<FilterableAttributeDef[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);

      const [{ data: taskData, error: taskError }, { data: visibleDefsRaw, error: visibleAttrError }, { data: filterableDefsRaw, error: filterableAttrError }] = await Promise.all([
        supabase
          .from("tasks")
          .select(`
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
          `)
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

      if (cancelled) return;

      const queryError = taskError ?? visibleAttrError ?? filterableAttrError;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const taskTools = taskData?.task_tools?.map((row) => row.tools).filter((t): t is ToolForFilter => t != null) ?? [];
      const tableColumns: VisibleTableColumn[] = (visibleDefsRaw ?? [])
        .map((row) => ({
          id: row.id,
          name: row.name,
          display_order: row.display_order,
          data_type: row.data_type ?? "",
        }))
        .filter((col) => col.name.trim().toLowerCase() !== "beginner friendly");

      const attrs: FilterableAttributeDef[] = (filterableDefsRaw ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        display_order: row.display_order,
        data_type: row.data_type as FilterableAttributeDef["data_type"],
      }));

      setTask(taskData ?? null);
      setTools(taskTools);
      setVisibleColumns(tableColumns);
      setFilterableAttributes(attrs);
      setLoading(false);
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl p-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-8 h-3 w-28" />
          <Skeleton className="mt-2 h-9 w-72" />
          <Skeleton className="mt-4 h-4 w-[32rem]" />
          <section className="mt-12">
            <Skeleton className="h-6 w-16" />
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-10 min-w-[18rem] flex-1" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-10 w-36" />
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <div className="grid min-w-[56rem] grid-cols-6 gap-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={`h-${i}`} className="h-11 rounded-none border-b border-gray-200" />
                  ))}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <Skeleton key={`r-${i}`} className="h-14 rounded-none border-b border-gray-100" />
                  ))}
                </div>
              </div>
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

  if (!task) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Task not found</h1>
      </main>
    );
  }

  const filterOptionsByAttributeId = buildFilterOptionsByAttribute(tools, filterableAttributes);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-8">
        <Link href="/" className="text-sm text-gray-500 underline-offset-4 hover:text-indigo-600 hover:underline">
          ← All tasks
        </Link>
        <p className="mt-8 text-xs font-medium uppercase tracking-wide text-gray-500">
          {categoryLabel(task.categories)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{task.name}</h1>
        {task.description ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600">{task.description}</p>
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
