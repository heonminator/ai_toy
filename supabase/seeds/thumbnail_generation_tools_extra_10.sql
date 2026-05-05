-- Seed: +10 AI tools for Thumbnail Generation (no overlap with Canva / MJ / DALL-E / Firefly / Leonardo).
-- Also fills description on existing Canva row if slug = canva.
--
-- Prerequisites:
--   - tasks.slug = 'thumbnail-generation'
--   - attribute_definitions names: Free Plan, Output Type, Commercial Use, Beginner Friendly, API Support
--
-- Expects: UNIQUE(tools.slug), UNIQUE(task_tools.task_id, tool_id), UNIQUE(tool_attribute_values.tool_id, attribute_id)

BEGIN;

-- Canva: add description only (does not insert tools row if missing)
UPDATE tools
SET
  description =
    'Canva is an in-browser design suite with templates, stock assets, and AI-powered Magic Media for generating images—well suited for social thumbnails, ads, and branded layouts without separate creative software.',
  updated_at = now()
WHERE slug = 'canva';

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
    'Stable Diffusion (AUTOMATIC1111)',
    'stable-diffusion-automatic1111',
    'Popular open-source Stable Diffusion Web UI for local or self-hosted generation—maximum control for thumbnails when you manage models and hardware yourself.',
    'Free software — GPU/compute and optional services may cost',
    'Advanced — install, models, and VRAM requirements',
    'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
    now(),
    now()
  ),
  (
    'DreamStudio',
    'dreamstudio',
    'Stability AI''s web studio for Stable Diffusion-class generation—fast iterations for concept thumbnails and stylized stills.',
    'Credit packs / subscriptions',
    'Easy — web UI with presets',
    'https://dreamstudio.ai',
    now(),
    now()
  ),
  (
    'Playground AI',
    'playground-ai',
    'Creative web playground mixing filters and models for social-ready imagery—good for experimenting with thumbnail styles.',
    'Freemium — limits then paid plans',
    'Easy — canvas-style workflows',
    'https://playground.ai',
    now(),
    now()
  ),
  (
    'Clipdrop',
    'clipdrop',
    'Suite of AI image utilities (generation, cleanup, relighting)—handy when thumbnails need quick fixes beyond pure generation.',
    'Freemium / subscription tiers',
    'Easy — modular tools',
    'https://clipdrop.co',
    now(),
    now()
  ),
  (
    'Runway ML',
    'runway-ml',
    'Creative toolkit spanning Gen models for image and video—useful when thumbnails sit inside short-form or motion workflows.',
    'Subscription / credit-based usage',
    'Moderate — many features to navigate',
    'https://runwayml.com',
    now(),
    now()
  ),
  (
    'Fotor AI',
    'fotor-ai',
    'All-in-one editor with AI image generator—quick thumbnail drafts combined with basic design tweaks.',
    'Freemium plus Pro plans',
    'Easy — guided for casual creators',
    'https://www.fotor.com/features/ai-image-generator/',
    now(),
    now()
  ),
  (
    'NightCafe',
    'nightcafe',
    'Community-focused AI art generator with styles and challenges—solid for exploring thumbnail moods and palettes.',
    'Credit packs / subscriptions',
    'Easy — style presets',
    'https://creator.nightcafe.studio',
    now(),
    now()
  ),
  (
    'Krea AI',
    'krea-ai',
    'Realtime-oriented creative tools including image generation—helpful for rapid thumbnail iterations and visual brainstorming.',
    'Freemium / paid tiers',
    'Moderate — realtime tooling learning curve',
    'https://www.krea.ai',
    now(),
    now()
  ),
  (
    'Ideogram',
    'ideogram',
    'Generator known for legible text-in-image—strong when thumbnails must include crisp headlines or logos.',
    'Free tier with limits; paid plans',
    'Easy — prompt-forward UI',
    'https://ideogram.ai',
    now(),
    now()
  ),
  (
    'Bing Image Creator',
    'bing-image-creator',
    'Microsoft consumer image generation (Copilot / DALL·E-class backends)—quick drafts for simple thumbnails tied to a Microsoft account.',
    'Free boosted credits; usage limits apply',
    'Very easy — conversational prompts',
    'https://www.bing.com/create',
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
    'stable-diffusion-automatic1111',
    'dreamstudio',
    'playground-ai',
    'clipdrop',
    'runway-ml',
    'fotor-ai',
    'nightcafe',
    'krea-ai',
    'ideogram',
    'bing-image-creator'
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
  v.value_json::jsonb,
  v.display_value,
  now()
FROM (
  VALUES
    -- Stable Diffusion (AUTOMATIC1111)
    (
      'stable-diffusion-automatic1111'::text,
      'Free Plan'::text,
      'true'::jsonb,
      'Yes — software is free; GPU/power costs apply'::text
    ),
    (
      'stable-diffusion-automatic1111',
      'Output Type',
      '["image"]'::jsonb,
      'Raster images'
    ),
    (
      'stable-diffusion-automatic1111',
      'Commercial Use',
      '"model_license_dependent"'::jsonb,
      'Depends on base model & checkpoint licenses — verify each asset'
    ),
    (
      'stable-diffusion-automatic1111',
      'Beginner Friendly',
      '2'::jsonb,
      'Technical — setup, drivers, and models'
    ),
    (
      'stable-diffusion-automatic1111',
      'API Support',
      'true'::jsonb,
      'Yes — via extensions / local REST (self-hosted)'
    ),
    -- DreamStudio
    ('dreamstudio', 'Free Plan', 'false'::jsonb, 'Limited trial credits; paid packs'),
    ('dreamstudio', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'dreamstudio',
      'Commercial Use',
      '"stability_terms"'::jsonb,
      'Allowed under Stability AI terms for eligible outputs'
    ),
    ('dreamstudio', 'Beginner Friendly', '4'::jsonb, 'Easy web workflow'),
    ('dreamstudio', 'API Support', 'true'::jsonb, 'Yes — Stability API ecosystem'),
    -- Playground AI
    ('playground-ai', 'Free Plan', 'true'::jsonb, 'Yes — limited free generations'),
    ('playground-ai', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'playground-ai',
      'Commercial Use',
      '"tier_dependent"'::jsonb,
      'Check Playground plan / export rights'
    ),
    ('playground-ai', 'Beginner Friendly', '5'::jsonb, 'Very approachable'),
    ('playground-ai', 'API Support', 'false'::jsonb, 'Primarily web UI'),
    -- Clipdrop
    ('clipdrop', 'Free Plan', 'true'::jsonb, 'Yes — limited daily free uses'),
    (
      'clipdrop',
      'Output Type',
      '["image","editing"]'::jsonb,
      'Generated images plus cleanup / enhancement utilities'
    ),
    (
      'clipdrop',
      'Commercial Use',
      '"terms_dependent"'::jsonb,
      'Follow Clipdrop / Stability commercial policy'
    ),
    ('clipdrop', 'Beginner Friendly', '5'::jsonb, 'Simple focused tools'),
    ('clipdrop', 'API Support', 'true'::jsonb, 'Yes — Clipdrop API available'),
    -- Runway ML
    ('runway-ml', 'Free Plan', 'false'::jsonb, 'Trial credits; ongoing use is paid'),
    (
      'runway-ml',
      'Output Type',
      '["image","video"]'::jsonb,
      'Still frames and generative video tooling'
    ),
    (
      'runway-ml',
      'Commercial Use',
      '"plan_dependent"'::jsonb,
      'Commercial rights vary by subscription — review Runway license'
    ),
    ('runway-ml', 'Beginner Friendly', '3'::jsonb, 'Moderate — many modalities'),
    ('runway-ml', 'API Support', 'true'::jsonb, 'Yes — developer APIs'),
    -- Fotor AI
    ('fotor-ai', 'Free Plan', 'true'::jsonb, 'Yes — basic free tier with limits'),
    ('fotor-ai', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'fotor-ai',
      'Commercial Use',
      '"plan_dependent"'::jsonb,
      'Higher tiers typically unlock broader commercial use'
    ),
    ('fotor-ai', 'Beginner Friendly', '5'::jsonb, 'Beginner-friendly editor'),
    ('fotor-ai', 'API Support', 'false'::jsonb, 'Consumer-focused; API not primary'),
    -- NightCafe
    ('nightcafe', 'Free Plan', 'true'::jsonb, 'Yes — daily free credits'),
    ('nightcafe', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'nightcafe',
      'Commercial Use',
      '"tier_dependent"'::jsonb,
      'Verify NightCafe subscription / competition rules'
    ),
    ('nightcafe', 'Beginner Friendly', '5'::jsonb, 'Preset-heavy'),
    ('nightcafe', 'API Support', 'true'::jsonb, 'Yes — NightCafe API'),
    -- Krea AI
    ('krea-ai', 'Free Plan', 'true'::jsonb, 'Yes — limited free usage'),
    ('krea-ai', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'krea-ai',
      'Commercial Use',
      '"terms_dependent"'::jsonb,
      'Follow Krea terms for commercial redistribution'
    ),
    ('krea-ai', 'Beginner Friendly', '4'::jsonb, 'Moderate — realtime paradigms'),
    ('krea-ai', 'API Support', 'false'::jsonb, 'Primarily product UI'),
    -- Ideogram
    ('ideogram', 'Free Plan', 'true'::jsonb, 'Yes — slower queue / caps on free tier'),
    ('ideogram', 'Output Type', '["image"]'::jsonb, 'Raster images with strong typography'),
    (
      'ideogram',
      'Commercial Use',
      '"plan_dependent"'::jsonb,
      'Paid tiers clarify commercial usage — check Ideogram policy'
    ),
    ('ideogram', 'Beginner Friendly', '5'::jsonb, 'Straightforward prompting'),
    ('ideogram', 'API Support', 'true'::jsonb, 'Yes — Ideogram API'),
    -- Bing Image Creator
    (
      'bing-image-creator',
      'Free Plan',
      'true'::jsonb,
      'Yes — boosted generations with Microsoft account; caps apply'
    ),
    ('bing-image-creator', 'Output Type', '["image"]'::jsonb, 'Raster images'),
    (
      'bing-image-creator',
      'Commercial Use',
      '"microsoft_terms"'::jsonb,
      'Subject to Microsoft Services Agreement / Copilot terms'
    ),
    ('bing-image-creator', 'Beginner Friendly', '5'::jsonb, 'Very easy chat-style prompts'),
    ('bing-image-creator', 'API Support', 'false'::jsonb, 'Consumer surface — no general public API focus')
) AS v(tool_slug, attr_name, value_json, display_value)
INNER JOIN tools AS tl ON tl.slug = v.tool_slug
INNER JOIN attribute_definitions AS ad ON ad.name = v.attr_name
ON CONFLICT (tool_id, attribute_id) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  display_value = EXCLUDED.display_value,
  updated_at = EXCLUDED.updated_at;

COMMIT;
