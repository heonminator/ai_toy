create extension if not exists pgcrypto;

create table if not exists public.tool_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  source text,
  raw_description text,
  extracted_description text,
  detected_tasks jsonb not null default '[]'::jsonb,
  novelty_score numeric,
  usability_score numeric,
  proof_score numeric,
  total_score numeric,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
