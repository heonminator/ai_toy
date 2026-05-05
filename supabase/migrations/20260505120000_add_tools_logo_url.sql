-- Optional logo URL for tool branding in the task detail table.
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS logo_url text;
