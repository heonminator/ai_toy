/** Stable keys derived from tool_attribute_values.value_json for filtering. */

export type AttributeId = string;

export type AttributeDataType =
  | "boolean"
  | "single_select"
  | "multi_select"
  | "rating"
  | (string & {});

export type ToolAttributeValueForFilter = {
  attribute_id: AttributeId;
  display_value: string;
  value_json: unknown;
};

export type ToolForFilter = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pricing_summary: string | null;
  difficulty_summary: string | null;
  website_url: string;
  /** Optional logo URL; when null/empty, UI may show initials placeholder. */
  logo_url: string | null;
  tool_attribute_values: ToolAttributeValueForFilter[] | null;
};

export type FilterableAttributeDef = {
  id: AttributeId;
  name: string;
  data_type: AttributeDataType;
  display_order: number | null;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type BooleanYesOnlyState = Partial<Record<AttributeId, boolean>>;
export type SingleSelectState = Partial<Record<AttributeId, string>>;
export type MultiSelectState = Partial<Record<AttributeId, string[]>>;

export function jsonToBoolean(value_json: unknown): boolean | null {
  if (typeof value_json === "boolean") return value_json;
  return null;
}

/** Canonical string for single_select / rating comparison */
export function jsonToScalarKey(value_json: unknown): string | null {
  if (value_json === null || value_json === undefined) return null;
  if (typeof value_json === "string") return value_json;
  if (typeof value_json === "number") return String(value_json);
  if (typeof value_json === "boolean") return value_json ? "true" : "false";
  return null;
}

export function jsonToMultiKeys(value_json: unknown): string[] {
  if (Array.isArray(value_json)) {
    return value_json.map((x) => (typeof x === "string" ? x : String(x)));
  }
  if (typeof value_json === "string") return [value_json];
  return [];
}

function rowForAttribute(
  tool: ToolForFilter,
  attributeId: AttributeId,
): ToolAttributeValueForFilter | undefined {
  return tool.tool_attribute_values?.find((r) => r.attribute_id === attributeId);
}

export function toolPassesAttributeFilters(
  tool: ToolForFilter,
  filterable: readonly FilterableAttributeDef[],
  booleanYesOnly: BooleanYesOnlyState,
  singleSelect: SingleSelectState,
  multiSelect: MultiSelectState,
): boolean {
  for (const def of filterable) {
    const row = rowForAttribute(tool, def.id);
    const dt = def.data_type;

    if (dt === "boolean") {
      if (booleanYesOnly[def.id]) {
        const b = jsonToBoolean(row?.value_json);
        if (b !== true) return false;
      }
      continue;
    }

    if (dt === "single_select" || dt === "rating") {
      const selected = singleSelect[def.id];
      if (selected && selected !== "") {
        const key = jsonToScalarKey(row?.value_json);
        if (key !== selected) return false;
      }
      continue;
    }

    if (dt === "multi_select") {
      const selected = multiSelect[def.id];
      if (selected && selected.length > 0) {
        const keys = new Set(jsonToMultiKeys(row?.value_json));
        const everySelectedPresent = selected.every((s) => keys.has(s));
        if (!everySelectedPresent) return false;
      }
      continue;
    }
  }

  return true;
}

/** Build dropdown / multi options from current tools (value keys + display labels where useful). */
export function mapDisplayValuesForVisibleColumns(
  tool: ToolForFilter,
  visibleColumnIds: ReadonlySet<AttributeId>,
): Map<AttributeId, string> {
  const map = new Map<AttributeId, string>();
  for (const row of tool.tool_attribute_values ?? []) {
    if (!visibleColumnIds.has(row.attribute_id)) continue;
    map.set(row.attribute_id, row.display_value);
  }
  return map;
}

export function buildFilterOptionsByAttribute(
  tools: readonly ToolForFilter[],
  filterable: readonly FilterableAttributeDef[],
): Record<AttributeId, FilterOption[]> {
  const result: Record<AttributeId, FilterOption[]> = {};

  for (const def of filterable) {
    const dt = def.data_type;
    const map = new Map<string, string>();

    for (const tool of tools) {
      const row = rowForAttribute(tool, def.id);
      if (!row) continue;

      if (dt === "single_select" || dt === "rating") {
        const key = jsonToScalarKey(row.value_json);
        if (key !== null && !map.has(key)) {
          map.set(key, row.display_value.trim() || key);
        }
      } else if (dt === "multi_select") {
        for (const k of jsonToMultiKeys(row.value_json)) {
          if (!map.has(k)) map.set(k, k);
        }
      }
    }

    result[def.id] = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  }

  return result;
}
