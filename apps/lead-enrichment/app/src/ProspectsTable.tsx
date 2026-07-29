import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Loader2, Sparkles, Table2, Trash2 } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

type Sourced = { value: string; sourceUrl?: string };

// A researched cell: the value, and — when there is one — a link to the page it
// came from. No source link means the agent could not verify it, and the cell
// says so rather than looking like a fact.
function Cell({ field }: { field?: Sourced }) {
  if (!field) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  if (!field.sourceUrl) {
    return (
      <span
        className="text-muted-foreground italic"
        title="Found, but not verified against a source"
      >
        {field.value}
      </span>
    );
  }
  return (
    <a
      href={field.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-1 hover:text-foreground"
      title={field.sourceUrl}
    >
      <span className="truncate">{field.value}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
    </a>
  );
}

function ConfidenceDot({ confidence }: { confidence?: number }) {
  const c = confidence ?? 0;
  const tone =
    c >= 0.75
      ? "bg-emerald-400"
      : c >= 0.4
        ? "bg-amber-400"
        : "bg-muted-foreground/40";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${tone}`}
      title={`Confidence ${Math.round(c * 100)}%`}
    />
  );
}

function FitBadge({ score, reason }: { score?: number; reason?: string }) {
  if (typeof score !== "number") {
    return <span className="text-muted-foreground/40">—</span>;
  }
  const tone =
    score >= 8
      ? "bg-emerald-500/15 text-emerald-400"
      : score >= 5
        ? "bg-amber-500/15 text-amber-400"
        : "bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${tone}`}
      title={reason ?? "No justification recorded"}
    >
      {score}/10
    </span>
  );
}

export default function ProspectsTable() {
  const prospects = useQuery(api.prospects.list);
  const progress = useQuery(api.prospects.progress);
  const remove = useMutation(api.prospects.remove);
  const [batch, setBatch] = useState<string>("all");

  const all = prospects ?? [];
  const rows = batch === "all" ? all : all.filter((p) => p.batch === batch);
  const batches = progress?.batches ?? [];
  const enriching = all.filter((p) => p.status === "enriching").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Prospects</h1>
            <p className="text-xs text-muted-foreground">
              {progress === undefined
                ? "Researched, scored prospects"
                : `${progress.done}/${progress.total} researched${
                    progress.unverified > 0
                      ? ` · ${progress.unverified} couldn't be verified`
                      : ""
                  }`}
            </p>
          </div>
          {enriching > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> researching{" "}
              {enriching}
            </span>
          )}
          {batches.length > 1 && (
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All imports</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* best-fit strip */}
        {progress && progress.topFit.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">Best fits —</span>
            {progress.topFit.map((p) => (
              <span key={p.id} title={p.fitReason ?? undefined}>
                {p.name}
                {p.company ? ` (${p.company})` : ""} · {p.fitScore}/10
              </span>
            ))}
          </div>
        )}

        {/* grid */}
        {prospects === undefined ? (
          <div className="py-24 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : all.length === 0 ? (
          <EmptyHero />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-6 py-2 pr-2"></th>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Company</th>
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">LinkedIn</th>
                  <th className="py-2 pr-3 font-semibold">Recent</th>
                  <th className="py-2 pr-3 font-semibold">Fit</th>
                  <th className="w-8 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <Row
                    key={p._id}
                    p={p}
                    onRemove={() => void remove({ id: p._id })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ p, onRemove }: { p: Doc<"prospects">; onRemove: () => void }) {
  const researching = p.status === "enriching";
  return (
    <tr
      className={`group border-b border-border/50 align-top ${
        researching ? "animate-pulse" : ""
      }`}
    >
      <td className="py-2 pr-2">
        <ConfidenceDot confidence={p.confidence} />
      </td>
      <td className="py-2 pr-3 font-medium">{p.rawName}</td>
      <td className="max-w-[180px] truncate py-2 pr-3 text-muted-foreground">
        {p.company ? (
          <Cell field={p.company} />
        ) : (
          <span className="text-muted-foreground/60">
            {p.rawCompany ?? "—"}
          </span>
        )}
      </td>
      <td className="max-w-[180px] truncate py-2 pr-3 text-muted-foreground">
        <Cell field={p.title} />
      </td>
      <td className="max-w-[140px] truncate py-2 pr-3 text-muted-foreground">
        <Cell field={p.linkedin} />
      </td>
      <td className="max-w-[260px] py-2 pr-3 text-muted-foreground">
        <Cell field={p.news} />
      </td>
      <td className="py-2 pr-3">
        <FitBadge score={p.fitScore} reason={p.fitReason} />
      </td>
      <td className="py-2 text-right">
        <button
          className="invisible text-muted-foreground/50 hover:text-red-400 group-hover:visible"
          onClick={onRemove}
          aria-label={`Remove ${p.rawName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function EmptyHero() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <Table2 className="h-8 w-8 text-muted-foreground/50" />
      <div className="text-sm font-medium">No prospects yet</div>
      <p className="mx-auto max-w-sm text-xs text-muted-foreground">
        Drop a CSV into the chat and ask your agent to enrich it. Rows appear
        here immediately and fill in column by column as the research completes
        — each researched cell links to the page it came from, and anything that
        couldn&apos;t be verified says so instead of guessing.
      </p>
    </div>
  );
}
