BEGIN;

-- Canva
INSERT INTO tool_examples (
  tool_id, title, prompt, description, media_type, image_url
)
SELECT t.id, v.title, v.prompt, v.description, 'image', v.image_url
FROM tools t
JOIN (
  VALUES
  (
    'YouTube Thumbnail',
    'YouTube thumbnail for “How I Made $10,000 with AI”',
    'Template-based, clean layout with strong typography',
    'https://placehold.co/600x400?text=Canva+Thumbnail'
  ),
  (
    'Blog Header',
    'Minimal blog header image about AI tools for productivity',
    'Very polished, template-driven design',
    'https://placehold.co/600x400?text=Canva+Blog'
  ),
  (
    'Marketing Banner',
    'Modern marketing banner for AI SaaS product launch',
    'Brand-friendly and easy customization',
    'https://placehold.co/600x400?text=Canva+Banner'
  )
) AS v(title, prompt, description, image_url)
ON t.slug = 'canva';

-- Midjourney
INSERT INTO tool_examples (
  tool_id, title, prompt, description, media_type, image_url
)
SELECT t.id, v.title, v.prompt, v.description, 'image', v.image_url
FROM tools t
JOIN (
  VALUES
  (
    'YouTube Thumbnail',
    'YouTube thumbnail for “How I Made $10,000 with AI”',
    'Highly stylized, cinematic lighting, very creative',
    'https://placehold.co/600x400?text=Midjourney+Thumbnail'
  ),
  (
    'Blog Header',
    'Minimal blog header image about AI tools for productivity',
    'More artistic than practical',
    'https://placehold.co/600x400?text=Midjourney+Blog'
  ),
  (
    'Marketing Banner',
    'Modern marketing banner for AI SaaS product launch',
    'Strong visuals but less text control',
    'https://placehold.co/600x400?text=Midjourney+Banner'
  )
) AS v(title, prompt, description, image_url)
ON t.slug = 'midjourney';

-- DALL-E
INSERT INTO tool_examples (
  tool_id, title, prompt, description, media_type, image_url
)
SELECT t.id, v.title, v.prompt, v.description, 'image', v.image_url
FROM tools t
JOIN (
  VALUES
  (
    'YouTube Thumbnail',
    'YouTube thumbnail for “How I Made $10,000 with AI”',
    'Balanced between realism and prompt control',
    'https://placehold.co/600x400?text=DALL-E+Thumbnail'
  ),
  (
    'Blog Header',
    'Minimal blog header image about AI tools for productivity',
    'Clean and accurate prompt interpretation',
    'https://placehold.co/600x400?text=DALL-E+Blog'
  ),
  (
    'Marketing Banner',
    'Modern marketing banner for AI SaaS product launch',
    'Good composition, moderate design quality',
    'https://placehold.co/600x400?text=DALL-E+Banner'
  )
) AS v(title, prompt, description, image_url)
ON t.slug = 'dall-e';

-- Adobe Firefly
INSERT INTO tool_examples (
  tool_id, title, prompt, description, media_type, image_url
)
SELECT t.id, v.title, v.prompt, v.description, 'image', v.image_url
FROM tools t
JOIN (
  VALUES
  (
    'YouTube Thumbnail',
    'YouTube thumbnail for “How I Made $10,000 with AI”',
    'Adobe-style polished output, safe for commercial use',
    'https://placehold.co/600x400?text=Firefly+Thumbnail'
  ),
  (
    'Blog Header',
    'Minimal blog header image about AI tools for productivity',
    'Very clean and brand-consistent',
    'https://placehold.co/600x400?text=Firefly+Blog'
  ),
  (
    'Marketing Banner',
    'Modern marketing banner for AI SaaS product launch',
    'Strong integration with design workflows',
    'https://placehold.co/600x400?text=Firefly+Banner'
  )
) AS v(title, prompt, description, image_url)
ON t.slug = 'adobe-firefly';

-- Leonardo AI
INSERT INTO tool_examples (
  tool_id, title, prompt, description, media_type, image_url
)
SELECT t.id, v.title, v.prompt, v.description, 'image', v.image_url
FROM tools t
JOIN (
  VALUES
  (
    'YouTube Thumbnail',
    'YouTube thumbnail for “How I Made $10,000 with AI”',
    'Fast generation, slightly less refined',
    'https://placehold.co/600x400?text=Leonardo+Thumbnail'
  ),
  (
    'Blog Header',
    'Minimal blog header image about AI tools for productivity',
    'Decent quality, quick iteration',
    'https://placehold.co/600x400?text=Leonardo+Blog'
  ),
  (
    'Marketing Banner',
    'Modern marketing banner for AI SaaS product launch',
    'Good for experimentation',
    'https://placehold.co/600x400?text=Leonardo+Banner'
  )
) AS v(title, prompt, description, image_url)
ON t.slug = 'leonardo-ai';

COMMIT;
