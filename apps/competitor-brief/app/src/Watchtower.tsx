import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Binoculars, ExternalLink, Plus, Trash2, Users } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const MAX_COMPETITORS = 6;

const daysAgo = (ts?: number) =>
  ts === undefined ? null : Math.floor((Date.now() - ts) / 86_400_000);

export default function Watchtower() {
  const competitors = useQuery(api.watchtower.competitors);
  const briefs = useQuery(api.watchtower.briefs) ?? [];
  const add = useMutation(api.watchtower.addCompetitor);
  const [form, setForm] = useState({ name: "", siteUrl: "" });

  const rows = competitors ?? [];
  const full = rows.length >= MAX_COMPETITORS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Watchtower</h1>
          <p className="text-xs text-muted-foreground">
            {rows.length === 0
              ? "Who you're up against, and what changed"
              : `${rows.length} watched · ${briefs.length} weekly brief${briefs.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {competitors === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <Binoculars className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-medium">Nobody watched yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Paste a competitor&apos;s URL in the chat and say &quot;watch this
              one too&quot;. Every Monday your agent diffs their site, pricing,
              and careers page and writes a one-page brief: what changed, what
              it means, what to consider.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((c) => (
              <CompetitorCard key={c._id} competitor={c} />
            ))}
          </div>
        )}

        {/* add */}
        <div className="flex flex-wrap gap-2">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Competitor name"
            className="h-8 w-44 text-sm"
          />
          <Input
            value={form.siteUrl}
            onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
            placeholder="https://…"
            className="h-8 flex-1 text-sm"
          />
          <Button
            size="sm"
            className="h-8"
            disabled={!form.name.trim() || !form.siteUrl.trim() || full}
            onClick={() => {
              void add({ name: form.name, siteUrl: form.siteUrl });
              setForm({ name: "", siteUrl: "" });
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Watch
          </Button>
        </div>
        {full && (
          <p className="text-[11px] text-muted-foreground">
            Six is the useful limit — past that the brief stops being read. Your
            agent will suggest a second project instead.
          </p>
        )}

        {/* brief archive */}
        {briefs.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Monday briefs
            </div>
            <ol className="space-y-1.5">
              {briefs.map((b) => (
                <li key={b._id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">
                    {b.weekOf}
                  </span>
                  <span className="min-w-0 flex-1">{b.summary}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {b.changeCount === 0
                      ? "no changes"
                      : `${b.changeCount} change${b.changeCount === 1 ? "" : "s"}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: Doc<"competitors"> }) {
  const remove = useMutation(api.watchtower.removeCompetitor);
  const changedDays = daysAgo(competitor.lastChangeAt);
  const checkedDays = daysAgo(competitor.lastCheckedAt);

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium">{competitor.name}</span>
        <a
          href={competitor.siteUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Open ${competitor.name}`}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          className="invisible ml-auto text-muted-foreground/50 hover:text-red-400 group-hover:visible"
          onClick={() => void remove({ id: competitor._id })}
          aria-label={`Stop watching ${competitor.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {competitor.screenshotPath ? (
        <img
          src={competitor.screenshotPath}
          alt={`Latest screenshot of ${competitor.name}'s homepage`}
          className="h-28 w-full rounded border border-border/60 object-cover object-top"
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded border border-dashed border-border/60 text-[11px] text-muted-foreground/60">
          no screenshot yet
        </div>
      )}

      {competitor.pricePoints.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {competitor.pricePoints.slice(0, 4).map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex-1 truncate">{p.label}</span>
              <span className="tabular-nums">{p.value}</span>
            </li>
          ))}
        </ul>
      )}

      {competitor.hiringSignal && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <span className="rounded bg-secondary px-1 text-[10px] uppercase">
              inference
            </span>{" "}
            {competitor.hiringSignal}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 text-[10px] text-muted-foreground/70">
        <span>
          {changedDays === null
            ? "no change recorded"
            : changedDays === 0
              ? "changed today"
              : `changed ${changedDays}d ago`}
        </span>
        <span className="ml-auto">
          {checkedDays === null
            ? "never checked"
            : checkedDays === 0
              ? "checked today"
              : `checked ${checkedDays}d ago`}
        </span>
      </div>
    </div>
  );
}
