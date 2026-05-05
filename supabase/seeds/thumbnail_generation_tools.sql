-- Seed: Thumbnail Generation task — 4 AI image tools + task_tools links + tool_attribute_values.
-- Run in Supabase SQL Editor as one script.
--
-- Prerequisites:
--   - tasks.slug = 'thumbnail-generation' row exists (adjust TASK_SLUG below if yours differs).
--   - attribute_definitions rows exist for:
--       'Free Plan', 'Output Type', 'Commercial Use', 'Beginner Friendly', 'API Support'
--     (see attribute_definitions_canva.sql or your migrations).
--
-- Expects:
--   tools: UNIQUE (slug)
--   task_tools: UNIQUE (task_id, tool_id)
--   tool_attribute_values: UNIQUE (tool_id, attribute_id)

BEGIN;

-- Match your Task slug here if different from thumbnail-generation.
-- \set task_slug 'thumbnail-generation'  -- not used in Editor; change WHERE clause if needed.

INSERT INTO tools (
  name,
  slug,
  description,
  pricing_summary,
  difficulty_summary,
  website_url,
  created_at,
  updated_at
)
VALUES
  (
    'Midjourney',
    'midjourney',
    'Discord- and web-based generative AI for images; strong at stylized thumbnails and concept art.',
    'Paid subscription plans (no perpetual free tier)',
    'Moderate — Discord or web UI; prompt craft matters',
    'https://www.midjourney.com',
    now(),
    now()
  ),
  (
    'DALL-E',
    'dall-e',
    'OpenAI image generation (e.g. DALL·E 3) via ChatGPT and the Images API.',
    'Paid API / ChatGPT plans; limited free access varies by product',
    'Easy — natural-language prompts',
    'https://openai.com/dall-e-3',
    now(),
    now()
  ),
  (
    'Adobe Firefly',
    'adobe-firefly',
    'Adobe generative imaging integrated with Creative Cloud apps and Firefly web.',
    'Creative Cloud subscription / credit packs; limited free monthly credits',
    'Easy for Adobe users; familiar asset workflows',
    'https://www.adobe.com/products/firefly.html',
    now(),
    now()
  ),
  (
    'Leonardo AI',
    'leonardo-ai',
    'Web-based creative suite for AI images, motion, and asset pipelines.',
    'Freemium — daily free tokens plus paid tiers',
    'Easy — guided UI and presets',
    'https://leonardo.ai',
    now(),
    now()
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  pricing_summary = EXCLUDED.pricing_summary,
  difficulty_summary = EXCLUDED.difficulty_summary,
  website_url = EXCLUDED.website_url,
  updated_at = now();

INSERT INTO task_tools (task_id, tool_id)
SELECT tk.id, tl.id
FROM tasks AS tk
INNER JOIN tools AS tl ON tl.slug IN (
    'midjourney',
    'dall-e',
    'adobe-firefly',
    'leonardo-ai'
  )
WHERE tk.slug = 'thumbnail-generation'
ON CONFLICT (task_id, tool_id) DO NOTHING;

INSERT INTO tool_attribute_values (
  tool_id,
  attribute_id,
  value_json,
  display_value,
  updated_at
)
SELECT
  tl.id,
  ad.id,
  v.value_json,
  v.display_value,
  now()
FROM (
  VALUES
    -- Midjourney
    ('midjourney'::text, 'Free Plan'::text, to_jsonb(false), 'No — subscription required'::text),
    ('midjourney', 'Output Type', jsonb_build_array('image'), 'Raster images'),
    (
      'midjourney',
      'Commercial Use',
      to_jsonb('paid_plan_terms'::text),
      'Allowed with active paid plan — subject to Midjourney terms'
    ),
    ('midjourney', 'Beginner Friendly', to_jsonb(3), 'Moderate (Discord / prompt workflow)'),
    ('midjourney', 'API Support', to_jsonb(false), 'No general public API'),
    -- DALL-E
    ('dall-e', 'Free Plan', to_jsonb(false), 'Limited free via ChatGPT; API usage is paid'),
    ('dall-e', 'Output Type', jsonb_build_array('image'), 'Raster images'),
    (
      'dall-e',
      'Commercial Use',
      to_jsonb('allowed_per_terms'::text),
      'Allowed — follow OpenAI usage / content policies'
    ),
    ('dall-e', 'Beginner Friendly', to_jsonb(5), 'Very easy — prompt-only'),
    ('dall-e', 'API Support', to_jsonb(true), 'Yes — Images API'),
    -- Adobe Firefly
    ('adobe-firefly', 'Free Plan', to_jsonb(true), 'Yes — limited monthly generative credits'),
    (
      'adobe-firefly',
      'Output Type',
      jsonb_build_array('image', 'vector', 'video'),
      'Image, vector, video (product-dependent)'
    ),
    (
      'adobe-firefly',
      'Commercial Use',
      to_jsonb('adobe_license'::text),
      'Generally allowed for Adobe-licensed outputs — see Adobe terms'
    ),
    ('adobe-firefly', 'Beginner Friendly', to_jsonb(4), 'Easy inside Creative Cloud ecosystem'),
    ('adobe-firefly', 'API Support', to_jsonb(true), 'Yes — Firefly Services API'),
    -- Leonardo AI
    ('leonardo-ai', 'Free Plan', to_jsonb(true), 'Yes — daily token allowance on free tier'),
    (
      'leonardo-ai',
      'Output Type',
      jsonb_build_array('image', 'motion'),
      'Still images, motion / video-oriented outputs'
    ),
    (
      'leonardo-ai',
      'Commercial Use',
      to_jsonb('tier_dependent'::text),
      'Depends on subscription tier — check Leonardo license terms'
    ),
    ('leonardo-ai', 'Beginner Friendly', to_jsonb(5), 'Very approachable UI'),
    ('leonardo-ai', 'API Support', to_jsonb(true), 'Yes — Leonardo API')
) AS v(tool_slug, attr_name, value_json, display_value)
INNER JOIN tools AS tl ON tl.slug = v.tool_slug
INNER JOIN attribute_definitions AS ad ON ad.name = v.attr_name
ON CONFLICT (tool_id, attribute_id) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  display_value = EXCLUDED.display_value,
  updated_at = EXCLUDED.updated_at;

COMMIT;
