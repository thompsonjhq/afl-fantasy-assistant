-- Run once in the Supabase SQL editor. Adds tables for real per-game match logs,
-- real injury/selection scrapes, and fitted projection model coefficients.

create table if not exists player_game_logs (
  id bigint generated always as identity primary key,
  player_name text not null,
  team text,
  season int not null,
  round int not null,
  date text,
  opponent text,
  venue text,
  is_home boolean,
  win boolean,
  fantasy_points numeric not null,
  disposals numeric,
  goals numeric,
  scraped_at timestamptz default now(),
  unique (player_name, season, round)
);

create index if not exists idx_player_game_logs_player on player_game_logs (player_name);
create index if not exists idx_player_game_logs_venue on player_game_logs (venue);
create index if not exists idx_player_game_logs_opponent on player_game_logs (opponent);

create table if not exists injury_list (
  id bigint generated always as identity primary key,
  player_name text not null unique,
  club text,
  injury_type text,
  returning_timeframe text,
  scraped_at timestamptz default now()
);

create table if not exists team_selection_changes (
  id bigint generated always as identity primary key,
  club text not null,
  season int not null,
  round int not null,
  ins text[],
  outs text[],
  scraped_at timestamptz default now(),
  unique (club, season, round)
);

create table if not exists projection_model_coefficients (
  id bigint generated always as identity primary key,
  model_version text not null,
  fitted_at timestamptz default now(),
  coefficients jsonb not null,
  sample_size int,
  r_squared numeric
);
