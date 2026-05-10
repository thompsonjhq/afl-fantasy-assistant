"use client";

/**
 * components/ScrapeManager.tsx
 *
 * UI component for managing AFL Tables historical stat scraping.
 * Shows cache status for each squad player and provides scrape controls.
 *
 * Usage in page.tsx:
 *   import ScrapeManager from "@/components/ScrapeManager";
 *   <ScrapeManager />
 */

import { useState, useEffect, useCallback } from "react";

interface PlayerStatus {
  name: string;
  cached: boolean;
  stale: boolean;
  fetchedAt: string | null;
}

interface ScrapeResult {
  scraped: number;
  failed: number;
  players: Record<string, {
    games: number;
    seasonAvg: number;
    last3Avg: number;
    last5Avg: number;
  }>;
  errors: Record<string, string>;
}

export default function ScrapeManager() {
  const [statusList, setStatusList] = useState<PlayerStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/scrape?status=true");
      const json = await res.json();
      if (json.ok) setStatusList(json.status);
      else setError(json.error ?? "Status fetch failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const cachedCount = statusList.filter((p) => p.cached && !p.stale).length;
  const staleCount = statusList.filter((p) => p.stale).length;
  const totalCount = statusList.length;

  async function handleScrape(forceRefresh = false) {
    setScraping(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json);
        await fetchStatus();
      } else {
        setError(json.error ?? "Scrape failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setScraping(false);
    }
  }

  const needsScrape = staleCount > 0 || cachedCount < totalCount;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-300">
            Historical Stats
          </span>
          {loadingStatus ? (
            <span className="text-xs text-zinc-500 animate-pulse">checking…</span>
          ) : (
            <span className="text-xs text-zinc-500">
              {cachedCount}/{totalCount} cached
              {staleCount > 0 && (
                <span className="ml-1 text-amber-400">• {staleCount} stale</span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
          <button
            onClick={() => handleScrape(false)}
            disabled={scraping || !needsScrape}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              needsScrape && !scraping
                ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {scraping ? "Scraping…" : needsScrape ? "Fetch Missing" : "All Fresh"}
          </button>
          <button
            onClick={() => handleScrape(true)}
            disabled={scraping}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-40"
          >
            Force Refresh
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${(cachedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Scraping progress */}
      {scraping && (
        <div className="text-xs text-blue-400 animate-pulse">
          Scraping afltables.com… this takes ~20–30s for 16 players
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2">
          {error}
        </div>
      )}

      {/* Success result */}
      {result && !scraping && (
        <div className="text-xs text-emerald-400 bg-emerald-900/20 rounded-lg p-2">
          Scraped {result.scraped} players.
          {result.failed > 0 && (
            <span className="text-amber-400 ml-1">
              {result.failed} failed:{" "}
              {Object.entries(result.errors)
                .map(([n, e]) => `${n} (${e})`)
                .join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {expanded && statusList.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {statusList.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-2.5 py-1.5 gap-2"
            >
              <span className="text-xs text-zinc-300 truncate">{p.name}</span>
              <span
                className={`text-[10px] font-medium shrink-0 ${
                  !p.cached
                    ? "text-zinc-500"
                    : p.stale
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {!p.cached ? "missing" : p.stale ? "stale" : "fresh"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Result details (per player) */}
      {result && expanded && !scraping && (
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800">
          {Object.entries(result.players).map(([name, stats]) => (
            <div
              key={name}
              className="rounded-lg bg-zinc-800/50 px-2.5 py-1.5 space-y-0.5"
            >
              <div className="text-xs font-medium text-zinc-300 truncate">
                {name}
              </div>
              <div className="text-[10px] text-zinc-500">
                {stats.games}g · avg {stats.seasonAvg} · L3 {stats.last3Avg}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
