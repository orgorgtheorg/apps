import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, FileText, Quote, Trash2 } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

const DAY = 86_400_000;

const money = (n: number) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const fmt = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// safe → notice window open → act now. The chip is the whole triage.
function StatusChip({ contract }: { contract: Doc<"contracts"> }) {
  if (contract.status === "needsReview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
        <AlertTriangle className="h-3 w-3" /> needs review
      </span>
    );
  }
  if (contract.status !== "active") {
    return (
      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
        {contract.status === "noticeGiven" ? "notice given" : "ended"}
      </span>
    );
  }
  const days = Math.ceil((contract.noticeBy - Date.now()) / DAY);
  if (days < 0) {
    return (
      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
        notice window closed
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
        act now — {days}d to notice
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
        notice window opens in {days}d
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
      safe
    </span>
  );
}

export default function Registry() {
  const contracts = useQuery(api.contracts.list);
  const totals = useQuery(api.contracts.totals);
  const setStatus = useMutation(api.contracts.setStatus);
  const remove = useMutation(api.contracts.remove);

  const rows = contracts ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Contracts</h1>
          <p className="text-xs text-muted-foreground">
            {totals
              ? `${totals.count} active · ${money(totals.annualCommitment)} committed annually${
                  totals.needsReview > 0
                    ? ` · ${totals.needsReview} need your read`
                    : ""
                }`
              : "Leases, insurance, vendors — and the dates that cost money"}
          </p>
        </div>

        {contracts === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <FileText className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-medium">No contracts yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Drop any contract PDF into the chat. Your agent extracts the
              renewal date, the notice period, and the clause it came from —
              then promotes the date that actually matters: the last day you can
              give notice.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((c) => (
              <div
                key={c._id}
                className="group rounded-lg border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{c.party}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.type}
                  </span>
                  <StatusChip contract={c} />
                  <span className="ml-auto text-sm tabular-nums">
                    {c.annualCost
                      ? `${money(c.annualCost)}/yr`
                      : c.monthlyCost
                        ? `${money(c.monthlyCost)}/mo`
                        : "—"}
                  </span>
                  <button
                    className="invisible text-muted-foreground/50 hover:text-red-400 group-hover:visible"
                    onClick={() => void remove({ id: c._id })}
                    aria-label={`Remove ${c.party}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <span className="text-foreground">Notice by</span>{" "}
                    {fmt(c.noticeBy)}
                  </div>
                  <div>Renews {fmt(c.renewsAt)}</div>
                  <div>
                    {c.noticeDays}-day notice ·{" "}
                    {c.autoRenews ? "auto-renews" : "no auto-renewal"}
                  </div>
                </div>

                {c.citationQuote && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      &ldquo;{c.citationQuote}&rdquo;
                      {c.citation && (
                        <span className="text-muted-foreground/70">
                          {" "}
                          — {c.citation}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {c.ambiguityNote && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {c.ambiguityNote}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {c.filePath && (
                    <span
                      className="truncate text-[11px] text-muted-foreground"
                      title={c.filePath}
                    >
                      {c.filePath.split("/").pop()}
                    </span>
                  )}
                  {c.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() =>
                        void setStatus({ id: c._id, status: "noticeGiven" })
                      }
                    >
                      Notice given
                    </Button>
                  )}
                  {c.status !== "ended" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() =>
                        void setStatus({ id: c._id, status: "ended" })
                      }
                    >
                      Ended
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
