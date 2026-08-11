-- Run once in the Supabase SQL editor, after 003_fix_injury_list_uniqueness.sql.
--
-- team_matchup_profiles (the DVP - defense vs position - table built by lib/matchups.ts)
-- was created ad hoc against the live database and never had a migration file. This adds
-- one so the schema is reproducible; `create table if not exists` makes it a no-op against
-- a database that already has the table with matching shape.

create table if not exists team_matchup_profiles (
  id bigint generated always as identity primary key,
  season int not null,
  as_of_round int not null,
  team text not null,
  position text not null,
  games int not null,
  avg_score_conceded numeric not null,
  avg_expected_score numeric not null,
  points_conceded_vs_expected numeric not null,
  updated_at timestamptz default now(),
  unique (season, as_of_round, team, position)
);

create index if not exists idx_team_matchup_profiles_team_position
  on team_matchup_profiles (team, position);
