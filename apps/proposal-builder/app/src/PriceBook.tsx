import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeDollarSign,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function PriceBook() {
  const items = useQuery(api.priceBook.items);
  const quotes = useQuery(api.priceBook.quotes);
  const stale = useQuery(api.priceBook.staleRates) ?? [];
  const [tab, setTab] = useState<"rates" | "quotes">("rates");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Price book</h1>
            <p className="text-xs text-muted-foreground">
              Your rates and terms — what every quote is built from
            </p>
          </div>
          <div className="flex rounded-full border border-border p-0.5 text-xs">
            {(["rates", "quotes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 capitalize ${
                  tab === t
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
                {t === "quotes" && quotes ? ` (${quotes.length})` : ""}
              </button>
            ))}
          </div>
        </div>

        {stale.length > 0 && tab === "rates" && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">
              {stale.length} rate{stale.length === 1 ? "" : "s"} older than 6
              months —
            </span>
            {stale.slice(0, 4).map((s) => (
              <span key={s.name}>
                {s.name} ({s.monthsOld}mo)
              </span>
            ))}
          </div>
        )}

        {tab === "rates" ? <Rates items={items} /> : <Quotes quotes={quotes} />}
      </div>
    </div>
  );
}

// ── rates ─────────────────────────────────────────────────────────────────
function Rates({ items }: { items: Doc<"price_items">[] | undefined }) {
  const upsert = useMutation(api.priceBook.upsertItem);
  const remove = useMutation(api.priceBook.removeItem);
  const [draft, setDraft] = useState({
    name: "",
    unit: "per visit",
    rate: "",
    floorRate: "",
  });

  const add = async () => {
    const rate = Number(draft.rate);
    if (!draft.name.trim() || Number.isNaN(rate)) return;
    await upsert({
      name: draft.name,
      unit: draft.unit,
      rate,
      floorRate: draft.floorRate ? Number(draft.floorRate) : undefined,
    });
    setDraft({ name: "", unit: draft.unit, rate: "", floorRate: "" });
  };

  if (items === undefined) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <BadgeDollarSign className="h-7 w-7 text-muted-foreground/50" />
          <div className="text-sm font-medium">No rates yet</div>
          <p className="max-w-sm text-xs text-muted-foreground">
            Drop two or three past proposals into the chat and ask your agent to
            seed this — or add rates below. Every quote is built from these
            numbers, so a quote can never contain a price you never set.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Line item</th>
                <th className="px-3 py-2 font-semibold">Unit</th>
                <th className="px-3 py-2 text-right font-semibold">Rate</th>
                <th className="px-3 py-2 text-right font-semibold">Floor</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  className="group border-b border-border/50 last:border-0"
                >
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.unit}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money(item.rate)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {item.floorRate ? money(item.floorRate) : "—"}
                  </td>
                  <td className="px-2 text-right">
                    <button
                      className="invisible text-muted-foreground/50 hover:text-red-400 group-hover:visible"
                      onClick={() => void remove({ id: item._id })}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-5">
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Line item"
          className="h-8 text-sm sm:col-span-2"
        />
        <Input
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          placeholder="Unit"
          className="h-8 text-sm"
        />
        <Input
          value={draft.rate}
          onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
          placeholder="Rate"
          inputMode="decimal"
          className="h-8 text-sm"
        />
        <Input
          value={draft.floorRate}
          onChange={(e) => setDraft({ ...draft, floorRate: e.target.value })}
          placeholder="Floor (optional)"
          inputMode="decimal"
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && void add()}
        />
      </div>
      <div>
        <Button size="sm" className="h-8" onClick={() => void add()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add rate
        </Button>
        <span className="ml-3 text-[11px] text-muted-foreground">
          A floor rate makes your agent warn you when a quote lands under it.
        </span>
      </div>
    </div>
  );
}

// ── quotes ────────────────────────────────────────────────────────────────
function Quotes({ quotes }: { quotes: Doc<"quotes">[] | undefined }) {
  const setStatus = useMutation(api.priceBook.setQuoteStatus);

  if (quotes === undefined) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
        <FileText className="h-7 w-7 text-muted-foreground/50" />
        <div className="text-sm font-medium">No quotes yet</div>
        <p className="max-w-sm text-xs text-muted-foreground">
          Say &quot;quote for Oakridge Plaza — weekly mowing, about 2 acres,
          plus spring cleanup&quot; and your agent assembles the line items from
          your rates, does the math, and posts a branded PDF here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {quotes.map((q) => (
        <div
          key={q._id}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{q.client}</span>
            <span className="text-sm text-muted-foreground">{q.title}</span>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              v{q.version}
            </span>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {money(q.total)}
            </span>
          </div>

          {q.marginFlag && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {q.marginFlag}
            </div>
          )}

          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {q.lines.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-1 truncate">{l.label}</span>
                <span className="tabular-nums">
                  {l.quantity} × {money(l.rate)} {l.unit}
                </span>
                <span className="w-20 text-right tabular-nums">
                  {money(l.quantity * l.rate)}
                </span>
              </li>
            ))}
          </ul>

          {q.assumptions.length > 0 && (
            <div className="mt-2 border-t border-border/60 pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Judgment calls
              </div>
              <ul className="mt-0.5 list-inside list-disc text-xs text-muted-foreground">
                {q.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {q.pdfPath && (
              <span
                className="text-xs text-muted-foreground"
                title={q.pdfPath}
              >
                PDF in Files
              </span>
            )}
            {(["sent", "won", "lost"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={q.status === s ? "default" : "outline"}
                className="h-6 text-xs capitalize"
                onClick={() => void setStatus({ id: q._id, status: s })}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
