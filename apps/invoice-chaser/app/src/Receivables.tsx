import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertOctagon, Check, Clock, PhoneCall, Send } from "lucide-react";
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

const daysOverdue = (invoice: Doc<"invoices">) =>
  Math.floor((Date.now() - invoice.dueAt) / DAY);

// Warm the row with age — the aging table's whole job is to be readable at a glance.
const rowTone = (days: number) =>
  days < 0
    ? ""
    : days < 30
      ? "bg-amber-500/5"
      : days < 60
        ? "bg-amber-500/10"
        : days < 90
          ? "bg-orange-500/10"
          : "bg-red-500/10";

const TONE_LABEL: Record<string, string> = {
  gentle: "gentle",
  direct: "direct",
  firm: "firm",
  phoneCall: "phone call",
};

export default function Receivables() {
  const invoices = useQuery(api.receivables.list);
  const aging = useQuery(api.receivables.aging);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = (invoices ?? []).filter(
    (i) => i.status !== "paid" && i.status !== "writtenOff",
  );
  const paid = (invoices ?? []).filter((i) => i.status === "paid");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Receivables</h1>
          <p className="text-xs text-muted-foreground">
            {aging
              ? `${money(aging.totalOpen)} outstanding · ${money(aging.collectedThisMonth)} collected this month`
              : "What you're owed, and what's being done about it"}
          </p>
        </div>

        {/* aging summary */}
        {aging && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: "Current", value: aging.current, tone: "" },
              { label: "1–30", value: aging.d0, tone: "text-amber-400" },
              { label: "31–60", value: aging.d30, tone: "text-amber-400" },
              { label: "61–90", value: aging.d60, tone: "text-orange-400" },
              { label: "90+", value: aging.d90, tone: "text-red-400" },
            ].map((b) => (
              <div
                key={b.label}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {b.label}
                </div>
                <div className={`text-sm font-semibold tabular-nums ${b.tone}`}>
                  {money(b.value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {invoices === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <Check className="mx-auto h-7 w-7 text-emerald-400/70" />
            <div className="mt-2 text-sm font-medium">Nothing outstanding</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Drop an invoice list (or connect your accounting page) and your
              agent will track every open invoice here and chase it on an
              escalating schedule you control.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((invoice) => (
              <InvoiceRow
                key={invoice._id}
                invoice={invoice}
                open={openId === invoice._id}
                onToggle={() =>
                  setOpenId(openId === invoice._id ? null : invoice._id)
                }
              />
            ))}
          </div>
        )}

        {paid.length > 0 && (
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            {paid.length} paid · {money(paid.reduce((t, i) => t + i.amount, 0))}{" "}
            collected all time
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  open,
  onToggle,
}: {
  invoice: Doc<"invoices">;
  open: boolean;
  onToggle: () => void;
}) {
  const setStatus = useMutation(api.receivables.setStatus);
  const setAutoSend = useMutation(api.receivables.setAutoSend);
  const recordChase = useMutation(api.receivables.recordChase);
  const days = daysOverdue(invoice);

  return (
    <div
      className={`rounded-lg border border-border ${rowTone(days)} overflow-hidden`}
    >
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-sm font-medium">{invoice.client}</span>
        <span className="text-xs text-muted-foreground">#{invoice.number}</span>
        {invoice.status === "disputed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">
            <AlertOctagon className="h-3 w-3" /> disputed — chasing frozen
          </span>
        )}
        {invoice.status === "promised" && invoice.promisedFor && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> promised{" "}
            {new Date(invoice.promisedFor).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {days < 0 ? `due in ${-days}d` : `${days}d overdue`}
        </span>
        <span className="w-24 text-right text-sm font-semibold tabular-nums">
          {money(invoice.amount)}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 px-3 py-2.5">
          {/* chase history */}
          <div className="mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chase history ({invoice.chases.length})
            </div>
            {invoice.chases.length === 0 ? (
              <p className="text-xs text-muted-foreground/70">
                Not chased yet.
              </p>
            ) : (
              <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {invoice.chases.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="tabular-nums">
                      {new Date(c.at).toLocaleDateString()}
                    </span>
                    <span className="capitalize">
                      {TONE_LABEL[c.tone] ?? c.tone}
                    </span>
                    <span>{c.sent ? "sent" : "drafted"}</span>
                    {c.note && <span className="truncate">— {c.note}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* next draft */}
          {invoice.nextDraft ? (
            <div className="rounded-md bg-secondary/50 p-2">
              <div className="mb-1 text-[11px] text-muted-foreground">
                Next reminder ({TONE_LABEL[invoice.nextTone ?? "gentle"]})
              </div>
              <p className="whitespace-pre-wrap text-sm">{invoice.nextDraft}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    void recordChase({
                      id: invoice._id,
                      tone: invoice.nextTone ?? "gentle",
                      sent: true,
                      note: "approved in app",
                    })
                  }
                >
                  <Send className="mr-1 h-3 w-3" /> Approve — agent sends
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() =>
                    void recordChase({
                      id: invoice._id,
                      tone: invoice.nextTone ?? "gentle",
                      sent: false,
                      note: "skipped by user",
                    })
                  }
                >
                  Skip this one
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70">
              No reminder drafted right now.
            </p>
          )}

          {/* controls */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() =>
                void setStatus({ id: invoice._id, status: "paid" })
              }
            >
              <Check className="mr-1 h-3 w-3" /> Mark paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() =>
                void setStatus({
                  id: invoice._id,
                  status: "disputed",
                  disputeNote: "flagged in app",
                })
              }
            >
              Dispute — freeze
            </Button>
            {days >= 45 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                <PhoneCall className="h-3 w-3" /> past emailing — call them
              </span>
            )}
            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={invoice.autoSend ?? false}
                onChange={(e) =>
                  void setAutoSend({
                    id: invoice._id,
                    autoSend: e.target.checked,
                  })
                }
              />
              auto-send reminders to this client
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
