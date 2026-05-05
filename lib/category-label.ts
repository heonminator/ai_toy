/** Supabase may infer embedded `categories` as object or array depending on schema/types. */
export function categoryLabel(categories: unknown): string | undefined {
  if (!categories) return undefined;
  if (Array.isArray(categories)) {
    const first = categories[0] as { name?: string } | undefined;
    return first?.name;
  }
  return (categories as { name?: string }).name;
}
