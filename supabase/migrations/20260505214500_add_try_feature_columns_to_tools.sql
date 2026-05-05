alter table public.tools
add column if not exists has_api boolean not null default false,
add column if not exists try_enabled boolean not null default false,
add column if not exists api_provider text null;
