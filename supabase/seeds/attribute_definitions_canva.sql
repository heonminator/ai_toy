-- Idempotent seed for attribute_definitions + tool_attribute_values (Canva tool).
-- Run in Supabase SQL Editor as a single script.
--
-- Expects UNIQUE(name) on attribute_definitions and UNIQUE(tool_id, attribute_id) on tool_attribute_values.

BEGIN;

INSERT INTO attribute_definitions (
  name,
  description,
  data_type,
  is_filterable,
  is_sortable,
  is_visible_in_table,
  display_order,
  created_at,
  updated_at
)
VALUES
  (
    'Free Plan',
    'Whether this tool includes a usable free tier.',
    'boolean',
    true,
    false,
    true,
    1,
    now(),
    now()
  ),
  (
    'Output Type',
    'Formats or asset types produced by the tool.',
    'multi_select',
    true,
    false,
    true,
    2,
    now(),
    now()
  ),
  (
    'Commercial Use',
    'Whether/how commercial usage is permitted.',
    'single_select',
    true,
    false,
    true,
    3,
    now(),
    now()
  ),
  (
    'Beginner Friendly',
    'How approachable the tool is for new users (rating).',
    'rating',
    true,
    true,
    true,
    4,
    now(),
    now()
  ),
  (
    'API Support',
    'Whether programmatic access/API is offered.',
    'boolean',
    true,
    false,
    true,
    5,
    now(),
    now()
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  data_type = EXCLUDED.data_type,
  is_filterable = EXCLUDED.is_filterable,
  is_sortable = EXCLUDED.is_sortable,
  is_visible_in_table = EXCLUDED.is_visible_in_table,
  display_order = EXCLUDED.display_order,
  updated_at = now();

INSERT INTO tool_attribute_values (
  tool_id,
  attribute_id,
  value_json,
  display_value,
  updated_at
)
SELECT
  t.id,
  ad.id,
  v.value_json,
  v.display_value,
  now()
FROM tools AS t
CROSS JOIN LATERAL (
  VALUES
    ('Free Plan', to_jsonb(true), 'Yes'),
    (
      'Output Type',
      jsonb_build_array('graphic', 'presentation', 'pdf', 'video'),
      'Graphic, presentation, PDF, video'
    ),
    (
      'Commercial Use',
      to_jsonb('allowed_under_license'::text),
      'Allowed — subject to Canva Content License / terms'
    ),
    ('Beginner Friendly', to_jsonb(5), 'Very beginner-friendly'),
    ('API Support', to_jsonb(true), 'Yes (Canva Connect API)')
) AS v(attr_name, value_json, display_value)
JOIN attribute_definitions AS ad ON ad.name = v.attr_name
WHERE t.slug = 'canva'
ON CONFLICT (tool_id, attribute_id) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  display_value = EXCLUDED.display_value,
  updated_at = EXCLUDED.updated_at;

COMMIT;
