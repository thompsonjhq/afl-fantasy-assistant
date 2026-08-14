-- Run once in the Supabase SQL editor, after 008_add_player_ownership.sql.
--
-- Singleton-row table for tunable projection weights ("Proj Studio"). All multipliers default
-- to 1.0, which is a mathematical no-op against every formula in lib/projections.ts that uses
-- them (multiply/divide by 1) - so an unmodified row reproduces today's exact projection output,
-- not just an approximation of it. A curated subset of the ~15 hardcoded constants that shape a
-- projection, not all of them - picked the ones a user would meaningfully want to tune.

create table if not exists projection_settings (
  id bigint generated always as identity primary key,
  singleton boolean not null default true unique,
  form_sensitivity numeric not null default 1.0,
  opponent_sensitivity numeric not null default 1.0,
  matchup_weight numeric not null default 1.0,
  role_security_weight numeric not null default 1.0,
  injury_caution numeric not null default 1.0,
  updated_at timestamptz default now()
);

insert into projection_settings (singleton)
values (true)
on conflict (singleton) do nothing;
