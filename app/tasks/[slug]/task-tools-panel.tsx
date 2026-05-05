"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TABLE_BODY_CLASS,
  TABLE_HEAD_CELL_CLASS,
  TABLE_HEAD_ROW_CLASS,
  TABLE_ROW_CLASS,
} from "@/components/ui/table";
import type {
  AttributeId,
  BooleanYesOnlyState,
  FilterableAttributeDef,
  FilterOption,
  MultiSelectState,
  SingleSelectState,
  ToolAttributeValueForFilter,
  ToolForFilter,
} from "@/lib/tool-attribute-filters";
import {
  jsonToScalarKey,
  mapDisplayValuesForVisibleColumns,
  toolPassesAttributeFilters,
} from "@/lib/tool-attribute-filters";

export type VisibleTableColumn = {
  id: AttributeId;
  name: string;
  display_order: number | null;
  /** From attribute_definitions.data_type — used so rating sorts use value_json, not label text. */
  data_type: string;
};

/** Identifies which column drives sorting (Tool name, summaries, or a visible attribute). */
export type SortKey =
  | { kind: "tool"; field: "name" | "pricing_summary" | "difficulty_summary" }
  | { kind: "attribute"; attributeId: AttributeId };

export type SortOrder = "asc" | "desc";

export type ActiveSort =
  | { sortKey: SortKey; sortOrder: SortOrder }
  | null;

/** Fallback when value_json is not a plain number (maps longer display strings). */
const BEGINNER_FRIENDLY_LABEL_RANK: Record<string, number> = {
  "very easy": 5,
  easy: 4,
  medium: 3,
  hard: 2,
};

/**
 * Maps free-text tier labels to 2–5 (Very Easy … Hard).
 * Shared by rating display fallback and tools.difficulty_summary sorting.
 */
function ratingRankFromDisplayFallback(displayValue: string): number {
  const raw = displayValue.trim();
  if (!raw) return 999;
  const lower = raw.toLowerCase();
  if (BEGINNER_FRIENDLY_LABEL_RANK[lower] !== undefined) {
    return BEGINNER_FRIENDLY_LABEL_RANK[lower];
  }
  const firstSegment = lower.split(/[—\-–:]/)[0]?.trim() ?? lower;
  if (BEGINNER_FRIENDLY_LABEL_RANK[firstSegment] !== undefined) {
    return BEGINNER_FRIENDLY_LABEL_RANK[firstSegment];
  }
  if (firstSegment.startsWith("very easy")) return 5;
  if (/^easy\b/.test(firstSegment)) return 4;
  if (firstSegment.startsWith("medium") || firstSegment.startsWith("moderate"))
    return 3;
  if (firstSegment.startsWith("hard")) return 2;
  return 999;
}

/**
 * Sort key for the Difficulty column: uses only `tools.difficulty_summary`
 * (same tier mapping as above). No attribute / localeCompare.
 */
function difficultySummarySortRank(summary: string | null | undefined): number {
  const raw = (summary ?? "").trim();
  if (!raw) return 999;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  const leading = /^(\d+(?:\.\d+)?)/.exec(raw);
  if (leading) {
    const n = Number(leading[1]);
    if (!Number.isNaN(n)) return n;
  }
  return ratingRankFromDisplayFallback(raw);
}

/**
 * Pricing column: priority sort only (no localeCompare).
 * Free=1, Freemium=2, Paid=3, Credits=4; empty / unknown → 999 (last).
 */
function pricingSummarySortRank(value: string | null | undefined): number {
  const v = (value ?? "").toLowerCase().trim();
  if (!v) return 999;

  if (v === "free") return 1;
  if (v === "freemium") return 2;
  if (v === "paid") return 3;
  if (v === "credits") return 4;

  if (v.includes("freemium")) return 2;
  if (v.includes("credit")) return 4;
  if (v.includes("paid") || v.includes("subscription")) return 3;
  if (/\bfree\b/.test(v)) return 1;

  return 999;
}

/** Commercial Use attribute — render canned badges from value_json keys + display heuristics. */
const COMMERCIAL_USE_ALLOWED_KEYS = new Set([
  "allowed_per_terms",
  "adobe_license",
  "allowed_under_license",
  "paid_plan_terms",
  "stability_terms",
]);

const COMMERCIAL_USE_RESTRICTED_KEYS = new Set([
  "restricted",
  "no_commercial",
]);

const COMMERCIAL_USE_DEPENDS_KEYS = new Set([
  "tier_dependent",
  "model_license_dependent",
  "plan_dependent",
  "terms_dependent",
  "microsoft_terms",
]);

function isCommercialUseColumn(column: VisibleTableColumn): boolean {
  return column.name.trim().toLowerCase() === "commercial use";
}

function commercialUseTierFromRow(
  row: ToolAttributeValueForFilter,
): "allowed" | "restricted" | "depends" | null {
  const key = jsonToScalarKey(row.value_json)?.trim().toLowerCase() ?? "";
  if (key) {
    if (COMMERCIAL_USE_ALLOWED_KEYS.has(key)) return "allowed";
    if (COMMERCIAL_USE_RESTRICTED_KEYS.has(key)) return "restricted";
    if (COMMERCIAL_USE_DEPENDS_KEYS.has(key)) return "depends";
  }

  const d = row.display_value.trim().toLowerCase();
  if (!d) return null;

  if (
    /^allowed\b/.test(d) ||
    d.includes("generally allowed") ||
    d.includes("allowed under") ||
    d.includes("allowed with")
  ) {
    return "allowed";
  }
  if (
    /^restricted\b/.test(d) ||
    /^not allowed\b/.test(d) ||
    d.includes("non-commercial") ||
    d.includes("no commercial") ||
    d.includes("personal use only")
  ) {
    return "restricted";
  }
  if (
    /^depends\b/.test(d) ||
    /^depends on\b/.test(d) ||
    /^check \b/.test(d) ||
    /^verify \b/.test(d) ||
    /^follow \b/.test(d) ||
    d.includes("subject to") ||
    d.includes("vary by") ||
    d.includes("review ") ||
    /^typically /.test(d)
  ) {
    return "depends";
  }

  return null;
}

function isRatingColumn(column: VisibleTableColumn | undefined): boolean {
  if (!column) return false;
  const isRating =
    column.data_type?.trim().toLowerCase() === "rating";
  if (isRating) return true;
  const normalized = column.name.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "beginner friendly";
}

/** Prefer DB data_type=rating; also accept legacy column title "Beginner Friendly". */
function isRatingAttributeSortColumn(
  attributeId: AttributeId,
  visibleColumns: readonly VisibleTableColumn[],
): boolean {
  const col = visibleColumns.find((c) => c.id === attributeId);
  return isRatingColumn(col);
}

/** Parse numeric rating from value_json (Supabase jsonb). */
function numericFromValueJson(raw: unknown): number | null {
  let numericValue: number | null = null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    numericValue = raw;
  } else if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) numericValue = parsed;
  }
  return numericValue;
}

/** Uses value_json number first; else display_value label fallback. */
function ratingSortRank(
  tool: ToolForFilter,
  attributeId: AttributeId,
): number {
  const row = tool.tool_attribute_values?.find(
    (r) => r.attribute_id === attributeId,
  );
  if (!row) return 999;

  const raw = row.value_json;
  const numericValue = numericFromValueJson(raw);
  if (numericValue !== null) {
    return numericValue;
  }

  return ratingRankFromDisplayFallback(row.display_value);
}

type TaskToolsPanelProps = {
  tools: ToolForFilter[];
  visibleColumns: VisibleTableColumn[];
  filterableAttributes: FilterableAttributeDef[];
  filterOptionsByAttributeId: Record<AttributeId, FilterOption[]>;
  currentTaskSlug?: string;
};

function sortKeysEqual(a: SortKey, b: SortKey): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "tool" && b.kind === "tool") return a.field === b.field;
  if (a.kind === "attribute" && b.kind === "attribute") {
    return a.attributeId === b.attributeId;
  }
  return false;
}

/** Uses tool_attribute_values.display_value for attribute columns; plain fields otherwise. */
function sortValueForTool(tool: ToolForFilter, key: SortKey): string {
  switch (key.kind) {
    case "tool":
      switch (key.field) {
        case "name":
          return tool.name;
        case "pricing_summary":
          return tool.pricing_summary ?? "";
        case "difficulty_summary":
          return tool.difficulty_summary ?? "";
        default: {
          const _exhaustive: never = key.field;
          return _exhaustive;
        }
      }
    case "attribute": {
      const row = tool.tool_attribute_values?.find(
        (r) => r.attribute_id === key.attributeId,
      );
      return row?.display_value ?? "";
    }
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function compareToolsBySort(
  a: ToolForFilter,
  b: ToolForFilter,
  sortKey: SortKey,
  sortOrder: SortOrder,
  visibleColumns: readonly VisibleTableColumn[],
): number {
  if (sortKey.kind === "tool" && sortKey.field === "pricing_summary") {
    const aVal = pricingSummarySortRank(a.pricing_summary);
    const bVal = pricingSummarySortRank(b.pricing_summary);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  }

  if (sortKey.kind === "tool" && sortKey.field === "difficulty_summary") {
    const aVal = difficultySummarySortRank(a.difficulty_summary);
    const bVal = difficultySummarySortRank(b.difficulty_summary);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  }

  if (
    sortKey.kind === "attribute" &&
    isRatingAttributeSortColumn(sortKey.attributeId, visibleColumns)
  ) {
    const aVal = ratingSortRank(a, sortKey.attributeId);
    const bVal = ratingSortRank(b, sortKey.attributeId);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  }

  const va = sortValueForTool(a, sortKey).trim();
  const vb = sortValueForTool(b, sortKey).trim();
  const cmp = va.localeCompare(vb, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return sortOrder === "asc" ? cmp : -cmp;
}

function cycleSort(prev: ActiveSort, key: SortKey): ActiveSort {
  if (!prev || !sortKeysEqual(prev.sortKey, key)) {
    return { sortKey: key, sortOrder: "asc" };
  }
  if (prev.sortOrder === "asc") {
    return { sortKey: key, sortOrder: "desc" };
  }
  return null;
}

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  activeSort: ActiveSort;
  onSort: (key: SortKey) => void;
  className?: string;
};

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const active =
    activeSort !== null && sortKeysEqual(activeSort.sortKey, sortKey);
  const order = active ? activeSort.sortOrder : null;

  return (
    <th
      scope="col"
      aria-sort={
        active && order === "asc"
          ? "ascending"
          : active && order === "desc"
            ? "descending"
            : "none"
      }
      className={`whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide transition-colors ${className} ${active ? "!bg-indigo-50/80 !text-gray-900 ring-1 ring-inset ring-indigo-200/60" : "text-gray-600"}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group/sort inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 ${active ? "text-gray-900" : "text-gray-600"} ${active ? "hover:bg-indigo-100/60" : "hover:bg-gray-100"}`}
        aria-label={`Sort by ${label}`}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span
          className={`shrink-0 tabular-nums transition-colors duration-150 ${active ? "text-indigo-600 opacity-100" : "text-gray-400 opacity-0 group-hover/sort:opacity-100"}`}
          aria-hidden
        >
          {active ? (order === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function ToolAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const trimmed = logoUrl?.trim() ?? "";
  const showLogo = trimmed.length > 0 && !imgFailed;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setImgFailed(false);
  }, [trimmed]);

  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.06]">
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote logo URLs
        <img
          src={trimmed}
          alt=""
          width={36}
          height={36}
          className="size-9 bg-white object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-[13px] font-semibold text-gray-600 shadow-inner"
          aria-hidden
        >
          {initial}
        </div>
      )}
    </div>
  );
}

function PricingBadgeCell({ summary }: { summary: string | null }) {
  const r = pricingSummarySortRank(summary ?? "");
  const tiers: Record<
    1 | 2 | 3 | 4,
    { label: string; className: string }
  > = {
    1: { label: "Free", className: "bg-green-100 text-green-700" },
    2: { label: "Freemium", className: "bg-indigo-100 text-indigo-700" },
    3: { label: "Paid", className: "bg-zinc-800 text-white" },
    4: { label: "Credits", className: "bg-purple-100 text-purple-700" },
  };
  if (r >= 1 && r <= 4) {
    const t = tiers[r as 1 | 2 | 3 | 4];
    const tone = r === 1 ? "free" : r === 2 ? "freemium" : r === 3 ? "paid" : "credits";
    return <Badge variant="pricing" tone={tone}>{t.label}</Badge>;
  }
  if (!summary?.trim()) {
    return <span className="text-gray-400">—</span>;
  }
  return <Badge variant="pricing" tone="neutral" className="max-w-[16rem] truncate">{summary}</Badge>;
}

function DifficultyBadgeCell({ summary }: { summary: string | null }) {
  const rank = difficultySummarySortRank(summary ?? "");
  const styled: Partial<
    Record<number, { label: string; className: string }>
  > = {
    5: {
      label: "Very Easy",
      className: "bg-green-100 text-green-800 ring-green-200/70",
    },
    4: {
      label: "Easy",
      className: "bg-indigo-100 text-indigo-800 ring-indigo-200/70",
    },
    3: {
      label: "Medium",
      className: "bg-amber-100 text-amber-900 ring-amber-300/70",
    },
    2: {
      label: "Hard",
      className: "bg-red-100 text-red-800 ring-red-200/70",
    },
  };
  const hit = styled[rank];
  if (hit) {
    const tone = rank === 5 ? "very-easy" : rank === 4 ? "easy" : rank === 3 ? "medium" : "hard";
    return <Badge variant="difficulty" tone={tone}>{hit.label}</Badge>;
  }
  if (!summary?.trim()) {
    return <span className="text-gray-400">—</span>;
  }
  return <Badge variant="difficulty" tone="neutral" className="max-w-[16rem] truncate">{summary}</Badge>;
}

function attributeRowForTool(
  tool: ToolForFilter,
  attributeId: AttributeId,
): ToolAttributeValueForFilter | undefined {
  return tool.tool_attribute_values?.find((r) => r.attribute_id === attributeId);
}

function isFreePlanColumn(column: VisibleTableColumn): boolean {
  return column.name.trim().toLowerCase() === "free plan";
}

function isApiSupportColumn(column: VisibleTableColumn): boolean {
  return column.name.trim().toLowerCase() === "api support";
}

function isOutputTypeColumn(column: VisibleTableColumn): boolean {
  return column.name.trim().toLowerCase() === "output type";
}

function outputTypeSortRank(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (s.includes("image") || s.includes("raster")) return 0;
  if (s.includes("video")) return 1;
  if (s.includes("vector")) return 2;
  if (s.includes("design")) return 3;
  if (s.includes("motion")) return 4;
  return 99;
}

function ApiSupportBadgeCell({
  tool,
  column,
}: {
  tool: ToolForFilter;
  column: VisibleTableColumn;
}) {
  const row = attributeRowForTool(tool, column.id);
  if (!row) return <span className="text-gray-400">—</span>;

  let yes: boolean | null = null;
  if (typeof row.value_json === "boolean") {
    yes = row.value_json;
  } else {
    const d = row.display_value.trim().toLowerCase();
    if (d === "yes" || d.startsWith("yes")) yes = true;
    else if (d === "no" || d.startsWith("no")) yes = false;
  }

  if (yes === null) {
    return (
      <span className="text-xs leading-snug text-gray-600">
        {row.display_value}
      </span>
    );
  }

  return yes ? (
    <Badge variant="boolean" tone="yes">Yes</Badge>
  ) : (
    <Badge variant="boolean" tone="no">No</Badge>
  );
}

function BooleanGlyphCell({
  tool,
  column,
}: {
  tool: ToolForFilter;
  column: VisibleTableColumn;
}) {
  const row = attributeRowForTool(tool, column.id);
  if (!row) return <span className="text-gray-400">—</span>;

  let yes: boolean | null = null;
  if (typeof row.value_json === "boolean") {
    yes = row.value_json;
  } else {
    const d = row.display_value.trim().toLowerCase();
    if (d === "yes" || d.startsWith("yes")) yes = true;
    else if (d === "no" || d.startsWith("no")) yes = false;
  }

  if (yes === null) {
    return (
      <span className="text-xs leading-snug text-gray-600">
        {row.display_value}
      </span>
    );
  }

  const freePlan = isFreePlanColumn(column);

  return yes ? (
    <span
      className={
        freePlan
          ? "text-base font-bold text-green-600"
          : "text-base text-green-600"
      }
      aria-label="Yes"
    >
      ✔
    </span>
  ) : (
    <span
      className={
        freePlan ? "text-base text-gray-300" : "text-base text-gray-400"
      }
      aria-label="No"
    >
      ✖
    </span>
  );
}

function CommercialUseBadgeCell({
  tool,
  column,
}: {
  tool: ToolForFilter;
  column: VisibleTableColumn;
}) {
  const row = attributeRowForTool(tool, column.id);
  if (!row) return <span className="text-gray-400">—</span>;

  const tier = commercialUseTierFromRow(row);
  const label =
    tier === "allowed"
      ? "Allowed"
      : tier === "restricted"
        ? "Restricted"
        : tier === "depends"
          ? "Depends"
          : null;

  const classForTier =
    tier === "allowed"
      ? "bg-green-100 text-green-700"
      : tier === "restricted"
        ? "bg-red-100 text-red-700"
        : tier === "depends"
          ? "bg-yellow-100 text-yellow-700"
          : null;

  if (label && classForTier) {
    const tone = tier === "allowed" ? "allowed" : tier === "restricted" ? "restricted" : "depends";
    return <Badge variant="commercial" tone={tone}>{label}</Badge>;
  }

  return (
      <Badge variant="commercial" tone="neutral" className="max-w-[16rem] truncate" title={row.display_value}>
      {row.display_value.trim() || "—"}
      </Badge>
  );
}

function MultiSelectBadgesCell({
  tool,
  column,
}: {
  tool: ToolForFilter;
  column: VisibleTableColumn;
}) {
  const row = attributeRowForTool(tool, column.id);
  if (!row) return <span className="text-gray-400">—</span>;

  let items: string[] = [];
  if (Array.isArray(row.value_json)) {
    items = row.value_json.map((x) => String(x));
  } else if (typeof row.display_value === "string") {
    items = row.display_value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (items.length === 0) {
    return (
      <span className="text-xs leading-snug text-gray-600">
        {row.display_value || "—"}
      </span>
    );
  }

  const colored = isOutputTypeColumn(column);
  const orderedItems = colored
    ? [...items].sort((a, b) => {
        const rankDiff = outputTypeSortRank(a) - outputTypeSortRank(b);
        if (rankDiff !== 0) return rankDiff;
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      })
    : items;

  return (
    <div className="flex max-w-[18rem] flex-wrap gap-2">
      {orderedItems.map((x) => (
        <Badge
          key={x}
          variant={colored ? "output" : "commercial"}
          tone={
            colored
              ? x.toLowerCase().includes("video") || x.toLowerCase().includes("motion")
                ? "video"
                : x.toLowerCase().includes("vector")
                  ? "vector"
                  : x.toLowerCase().includes("design")
                    ? "design"
                    : x.toLowerCase().includes("image") || x.toLowerCase().includes("raster")
                      ? "image"
                      : "neutral"
              : "neutral"
          }
          className={!colored ? "border border-gray-200 bg-gray-50 text-gray-600" : undefined}
        >
          {x}
        </Badge>
      ))}
    </div>
  );
}

function AttributeTableCell({
  tool,
  column,
  displayFallback,
}: {
  tool: ToolForFilter;
  column: VisibleTableColumn;
  displayFallback: string | undefined;
}) {
  const dt = column.data_type?.trim().toLowerCase() ?? "";
  if (dt === "boolean" && isApiSupportColumn(column)) {
    return <ApiSupportBadgeCell tool={tool} column={column} />;
  }
  if (dt === "boolean") {
    return <BooleanGlyphCell tool={tool} column={column} />;
  }
  if (isCommercialUseColumn(column)) {
    return <CommercialUseBadgeCell tool={tool} column={column} />;
  }
  if (dt === "multi_select") {
    return <MultiSelectBadgesCell tool={tool} column={column} />;
  }
  if (!displayFallback) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <span className="text-sm leading-snug text-gray-600">{displayFallback}</span>
  );
}

export function TaskToolsPanel({
  tools,
  visibleColumns,
  filterableAttributes,
  filterOptionsByAttributeId,
  currentTaskSlug,
}: TaskToolsPanelProps) {
  const visibleAttrIds = useMemo(
    () => new Set<AttributeId>(visibleColumns.map((c) => c.id)),
    [visibleColumns],
  );
  const router = useRouter();

  const [booleanYesOnly, setBooleanYesOnly] =
    useState<BooleanYesOnlyState>({});
  const singleSelect = useMemo<SingleSelectState>(() => ({}), []);
  const [multiSelect, setMultiSelect] = useState<MultiSelectState>({});
  const [sort, setSort] = useState<ActiveSort>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "" | "very-easy" | "easy" | "medium" | "hard"
  >("");

  const freePlanAttrId = useMemo(
    () =>
      filterableAttributes.find(
        (a) => a.name.trim().toLowerCase() === "free plan",
      )?.id ?? null,
    [filterableAttributes],
  );
  const outputTypeAttrId = useMemo(
    () =>
      filterableAttributes.find(
        (a) =>
          a.name.trim().toLowerCase() === "output type" &&
          a.data_type === "multi_select",
      )?.id ?? null,
    [filterableAttributes],
  );
  const apiSupportAttrId = useMemo(
    () =>
      filterableAttributes.find(
        (a) => a.name.trim().toLowerCase() === "api support",
      )?.id ?? null,
    [filterableAttributes],
  );
  const outputTypeOptions = outputTypeAttrId
    ? filterOptionsByAttributeId[outputTypeAttrId] ?? []
    : [];

  const freeOnlyEnabled =
    freePlanAttrId !== null && booleanYesOnly[freePlanAttrId] === true;
  const apiOnlyEnabled =
    apiSupportAttrId !== null && booleanYesOnly[apiSupportAttrId] === true;
  const selectedOutputTypes =
    outputTypeAttrId !== null ? multiSelect[outputTypeAttrId] ?? [] : [];

  function matchesDifficulty(
    summary: string | null | undefined,
    filter: "" | "very-easy" | "easy" | "medium" | "hard",
  ): boolean {
    if (!filter) return true;
    const rank = difficultySummarySortRank(summary);
    if (filter === "very-easy") return rank === 5;
    if (filter === "easy") return rank === 4;
    if (filter === "medium") return rank === 3;
    if (filter === "hard") return rank === 2;
    return true;
  }

  const filteredTools = useMemo(
    () =>
      tools.filter((tool) => {
        const q = searchQuery.trim().toLowerCase();
        if (q && !tool.name.toLowerCase().includes(q)) return false;
        if (!matchesDifficulty(tool.difficulty_summary, difficultyFilter)) {
          return false;
        }
        return toolPassesAttributeFilters(
          tool,
          filterableAttributes,
          booleanYesOnly,
          singleSelect,
          multiSelect,
        );
      }),
    [
      tools,
      searchQuery,
      difficultyFilter,
      filterableAttributes,
      booleanYesOnly,
      singleSelect,
      multiSelect,
    ],
  );

  const displayedTools = useMemo(() => {
    const list = [...filteredTools];
    if (!sort) return list;

    const attrId =
      sort.sortKey.kind === "attribute" ? sort.sortKey.attributeId : null;
    const isRatingSort =
      attrId !== null &&
      isRatingAttributeSortColumn(attrId, visibleColumns);

    if (
      isRatingSort &&
      attrId !== null &&
      process.env.NODE_ENV === "development"
    ) {
      const ratingAttrId = attrId;
      const beforeSample = list.map((t) => {
        const row = t.tool_attribute_values?.find(
          (r) => r.attribute_id === ratingAttrId,
        );
        return {
          tool: t.name,
          value_json: row?.value_json,
          numericFromJson: numericFromValueJson(row?.value_json),
          finalRank: ratingSortRank(t, ratingAttrId),
        };
      });
      // eslint-disable-next-line no-console -- dev-only sort debug
      console.log("[TaskToolsPanel] rating sort (input rows)", {
        sortOrder: sort.sortOrder,
        attributeId: ratingAttrId,
        rows: beforeSample,
      });
    }

    list.sort((a, b) =>
      compareToolsBySort(a, b, sort.sortKey, sort.sortOrder, visibleColumns),
    );

    if (
      isRatingSort &&
      attrId !== null &&
      process.env.NODE_ENV === "development"
    ) {
      const ratingAttrId = attrId;
      // eslint-disable-next-line no-console -- dev-only sort debug
      console.log(
        "[TaskToolsPanel] rating sort (order after sort)",
        list.map((t) => ({
          tool: t.name,
          rank: ratingSortRank(t, ratingAttrId),
        })),
      );
    }

    return list;
  }, [filteredTools, sort, visibleColumns]);

  function handleSortClick(key: SortKey) {
    setSort((prev) => cycleSort(prev, key));
  }

  function setMultiOption(
    attributeId: AttributeId,
    optionValue: string,
    checked: boolean,
  ) {
    setMultiSelect((prev) => {
      const current = prev[attributeId] ?? [];
      const next = checked
        ? [...new Set([...current, optionValue])]
        : current.filter((v) => v !== optionValue);
      const copy: MultiSelectState = { ...prev };
      if (next.length === 0) delete copy[attributeId];
      else copy[attributeId] = next;
      return copy;
    });
  }

  function setBooleanToggle(attributeId: AttributeId | null, enabled: boolean) {
    if (!attributeId) return;
    setBooleanYesOnly((prev) => {
      const copy = { ...prev };
      if (enabled) copy[attributeId] = true;
      else delete copy[attributeId];
      return copy;
    });
  }

  function handleOutputTypeToggle(optionValue: string) {
    if (!outputTypeAttrId) return;
    const selected = new Set(multiSelect[outputTypeAttrId] ?? []);
    const nextChecked = !selected.has(optionValue);
    setMultiOption(outputTypeAttrId, optionValue, nextChecked);
  }

  function resetTopBarFilters() {
    setSearchQuery("");
    setDifficultyFilter("");
    if (freePlanAttrId) setBooleanToggle(freePlanAttrId, false);
    if (apiSupportAttrId) setBooleanToggle(apiSupportAttrId, false);
    if (outputTypeAttrId) {
      setMultiSelect((prev) => {
        const copy = { ...prev };
        delete copy[outputTypeAttrId];
        return copy;
      });
    }
  }

  function navigateToToolDetail(toolSlug: string) {
    const href = currentTaskSlug
      ? `/tools/${toolSlug}?fromTask=${encodeURIComponent(currentTaskSlug)}`
      : `/tools/${toolSlug}`;
    router.push(href);
  }

  return (
    <div className="mt-10 space-y-10">
      <Card className="sticky top-0 z-40 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[18rem] flex-[1.4]">
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              aria-label="Search tools"
            />
          </div>

          <div className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setBooleanToggle(freePlanAttrId, false)}
              className={`rounded-lg px-3 ${freeOnlyEnabled ? "text-gray-500" : "bg-indigo-500 text-white"}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setBooleanToggle(freePlanAttrId, true)}
              className={`rounded-lg px-3 ${freeOnlyEnabled ? "bg-indigo-500 text-white" : "text-gray-600"}`}
            >
              Free only
            </button>
          </div>

          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1">
            {outputTypeOptions.map((opt) => {
              const selected = selectedOutputTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleOutputTypeToggle(opt.value)}
                  className={`h-8 rounded-full border px-3 text-sm ${selected ? "border-indigo-200 bg-indigo-100 text-indigo-700" : "border-gray-200 bg-white text-gray-600"}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <select
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(
                e.target.value as "" | "very-easy" | "easy" | "medium" | "hard",
              )
            }
            aria-label="Difficulty filter"
          >
            <option value="">All difficulty</option>
            <option value="very-easy">Very Easy</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <div className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setBooleanToggle(apiSupportAttrId, false)}
              className={`rounded-lg px-3 ${apiOnlyEnabled ? "text-gray-500" : "bg-indigo-500 text-white"}`}
            >
              API: All
            </button>
            <button
              type="button"
              onClick={() => setBooleanToggle(apiSupportAttrId, true)}
              className={`rounded-lg px-3 ${apiOnlyEnabled ? "bg-indigo-500 text-white" : "text-gray-600"}`}
            >
              API only
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={resetTopBarFilters}
            className="ml-auto px-3"
          >
            Reset
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Showing {filteredTools.length} of {tools.length} tools
        </p>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white">
        <table className="min-w-max w-full border-collapse text-left text-sm leading-6">
          <thead>
            <tr className={TABLE_HEAD_ROW_CLASS}>
              <SortableHeader
                label="Tool"
                sortKey={{ kind: "tool", field: "name" }}
                activeSort={sort}
                onSort={handleSortClick}
                className="relative sticky left-0 z-30 border-r border-gray-100/70 bg-white text-gray-600 shadow-[8px_0_24px_-12px_rgba(15,23,42,0.06),1px_0_0_0_rgba(15,23,42,0.04)] before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-5 before:bg-gradient-to-l before:from-neutral-950/[0.035] before:to-transparent"
              />
              <SortableHeader
                label="Pricing"
                sortKey={{ kind: "tool", field: "pricing_summary" }}
                activeSort={sort}
                onSort={handleSortClick}
                className="text-gray-600"
              />
              <SortableHeader
                label="Difficulty"
                sortKey={{ kind: "tool", field: "difficulty_summary" }}
                activeSort={sort}
                onSort={handleSortClick}
              />
              {visibleColumns.map((attr) => (
                <SortableHeader
                  key={attr.id}
                  label={attr.name}
                  sortKey={{ kind: "attribute", attributeId: attr.id }}
                  activeSort={sort}
                  onSort={handleSortClick}
                />
              ))}
              <th
                scope="col"
                className={`whitespace-nowrap ${TABLE_HEAD_CELL_CLASS}`}
              >
                Website
              </th>
            </tr>
          </thead>
          <tbody className={TABLE_BODY_CLASS}>
            {displayedTools.map((tool, rowIndex) => {
              const displayByAttrId = mapDisplayValuesForVisibleColumns(
                tool,
                visibleAttrIds,
              );
              const zebra = rowIndex % 2 === 1;

              return (
                <tr
                  key={tool.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a,button,input,select,textarea,label")) {
                      return;
                    }
                    navigateToToolDetail(tool.slug);
                  }}
                  className={`${TABLE_ROW_CLASS} ${zebra ? "bg-gray-50/55" : "bg-white"} cursor-pointer`}
                >
                  <td className={`relative sticky left-0 z-10 whitespace-nowrap border-r border-gray-200 px-4 py-3 shadow-[6px_0_18px_-12px_rgba(15,23,42,0.05),1px_0_0_0_rgba(15,23,42,0.03)] transition-[background-color] duration-200 ease-out before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-5 before:bg-gradient-to-l before:from-neutral-950/[0.025] before:to-transparent group-hover:bg-blue-50/30 ${zebra ? "bg-gray-50/55" : "bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <ToolAvatar name={tool.name} logoUrl={tool.logo_url} />
                      <Link
                        href={
                          currentTaskSlug
                            ? `/tools/${tool.slug}?fromTask=${encodeURIComponent(currentTaskSlug)}`
                            : `/tools/${tool.slug}`
                        }
                        prefetch={true}
                        className="font-semibold tracking-tight text-gray-900 hover:text-indigo-600 hover:underline underline-offset-4"
                      >
                        {tool.name}
                      </Link>
                    </div>
                  </td>
                  <td className="bg-inherit whitespace-nowrap px-4 py-3 align-middle text-gray-700">
                    <PricingBadgeCell summary={tool.pricing_summary} />
                  </td>
                  <td className="bg-inherit whitespace-nowrap px-4 py-3 align-middle text-gray-600">
                    <DifficultyBadgeCell summary={tool.difficulty_summary} />
                  </td>
                  {visibleColumns.map((attr) => (
                    <td
                      key={attr.id}
                      className="min-w-[9rem] max-w-[18rem] bg-inherit whitespace-normal break-words px-4 py-3 align-middle text-gray-600"
                    >
                      <AttributeTableCell
                        tool={tool}
                        column={attr}
                        displayFallback={
                          displayByAttrId.has(attr.id)
                            ? displayByAttrId.get(attr.id)
                            : undefined
                        }
                      />
                    </td>
                  ))}
                  <td className="bg-inherit whitespace-nowrap px-4 py-3 align-middle text-gray-600">
                    <Link
                      href={tool.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {displayedTools.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 4}
                  className="px-6 py-12 text-center"
                >
                  <p className="text-sm font-medium text-gray-700">No tools found</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Try adjusting search or filter options.
                  </p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
