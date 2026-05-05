create extension if not exists pgcrypto;

create table if not exists public.tool_events (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references public.tools (id),
  event_type text not null,
  session_id text,
  user_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
