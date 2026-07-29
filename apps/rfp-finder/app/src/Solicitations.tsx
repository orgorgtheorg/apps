import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, FileText, Gavel, Repeat } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

const DAY = 86_400_000;

const daysLeft = (dueAt: number) => Math.ceil((dueAt - Date.now()) / DAY);

function DeadlineChip({ dueAt }: { dueAt: number }) {
  const d = daysLeft(dueAt);
  const tone =
    d < 0
      ? "bg-secondary text-muted-foreground"
      : d <= 3
        ? "bg-red-500/15 text-red-400"
        : d <= 10
          ? "bg-amber-500/15 text-amber-400"
          : "bg-secondary text-muted-foreground";
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${tone}`}
      title={new Date(dueAt).toLocaleString()}
    >
      {d < 0 ? "closed" : `${d}d left`}
    </span>
  );
}

function FitBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "bg-emerald-500/15 text-emerald-400"
      : score >= 5
        ? "bg-amber-500/15 text-amber-400"
        : "bg-secondary text-muted-foreground";
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${tone}`}
    >
      fit {score}/10
    </span>
  );
}

export default function Solicitations() {
  const rows = useQuery(api.solicitations.list);
  const stats = useQuery(api.solicitations.stats);
  const [showClosed, setShowClosed] = useState(false);

  const all = rows ?? [];
  const visible = all.filter((s) =>
    showClosed
      ? true
      : s.decision !== "noGo" &&
        s.decision !== "lost" &&
        s.dueAt > Date.now() - DAY,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">
              Solicitations
            </h1>
            <p className="text-xs text-muted-foreground">
              {stats
                ? `${stats.open} open · ${stats.dueThisWeek} due this week · ${stats.won}W/${stats.lost}L`
                : "Matching public bids, sorted by deadline"}
            </p>
          </div>
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showClosed ? "Hide passed & closed" : "Show all"}
          </button>
        </div>

        {rows === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <Gavel className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-medium">Nothing matching yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Your agent sweeps SAM.gov and your state portals daily against
              your capabilities profile. Matches land here with a fit score that
              explains itself and a go/no-go recommendation.
            </p>
          </div>
        ) : (
          visible.map((s) => <Card key={s._id} solicitation={s} />)
        )}
      </div>
    </div>
  );
}

function Card({ solicitation }: { solicitation: Doc<"solicitations"> }) {
  const setDecision = useMutation(api.solicitations.setDecision);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        className="flex w-full flex-wrap items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{solicitation.agency}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {solicitation.title}
        </span>
        <FitBadge score={solicitation.fitScore} />
        <DeadlineChip dueAt={solicitation.dueAt} />
      </button>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>{solicitation.source}</span>
        {solicitation.estimatedValue && (
          <span>{solicitation.estimatedValue}</span>
        )}
        {solicitation.setAside && <span>{solicitation.setAside}</span>}
        <span className="capitalize">{solicitation.decision}</span>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm">{solicitation.summary}</p>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Why this score
            </div>
            <ul className="mt-0.5 list-inside list-disc text-xs text-muted-foreground">
              {solicitation.fitReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <p className="rounded-md bg-secondary/40 p-2 text-sm">
            {solicitation.recommendation}
          </p>

          {solicitation.reusedFrom && (
            <div className="flex items-start gap-1.5 text-xs text-emerald-400">
              <Repeat className="mt-0.5 h-3 w-3 shrink-0" />
              {solicitation.reusedFrom}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={solicitation.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> the solicitation
            </a>
            {solicitation.responseDocPath && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                title={solicitation.responseDocPath}
              >
                <FileText className="h-3 w-3" /> response draft in Files
              </span>
            )}
            <Button
              size="sm"
              className="ml-auto h-7 text-xs"
              onClick={() =>
                void setDecision({ id: solicitation._id, decision: "go" })
              }
            >
              Go — start drafting
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() =>
                void setDecision({ id: solicitation._id, decision: "noGo" })
              }
            >
              No-go
            </Button>
          </div>

          {solicitation.decision === "submitted" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() =>
                  void setDecision({ id: solicitation._id, decision: "won" })
                }
              >
                Won
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() =>
                  void setDecision({ id: solicitation._id, decision: "lost" })
                }
              >
                Lost
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
