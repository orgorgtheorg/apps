import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, FileText, Receipt, Trash2 } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";

const pct = (done: number, total: number) =>
  total === 0 ? 100 : Math.round((done / total) * 100);

const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

function Bar({ done, total }: { done: number; total: number }) {
  const p = pct(done, total);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full ${p === 100 ? "bg-emerald-400" : "bg-primary"}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export default function CloseChecklist() {
  const months = useQuery(api.close.months);
  const rules = useQuery(api.close.rules) ?? [];
  const [showRules, setShowRules] = useState(false);

  const rows = months ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">Close</h1>
            <p className="text-xs text-muted-foreground">
              {rows.length === 0
                ? "Month-end, ready before month-end"
                : `${rows.length} month${rows.length === 1 ? "" : "s"} tracked · ${rules.length} learned rules`}
            </p>
          </div>
          <button
            onClick={() => setShowRules((v) => !v)}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showRules ? "Hide rules" : "Categorization rules"}
          </button>
        </div>

        {showRules && <Rules rules={rules} />}

        {months === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <Receipt className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <div className="mt-2 text-sm font-medium">Nothing tracked yet</div>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Each week your agent categorizes new transactions, matches
              receipts from your inbox and files, and lists the few things it
              genuinely couldn&apos;t place — so month-end is a review, not
              archaeology.
            </p>
          </div>
        ) : (
          rows.map((m) => <MonthCard key={m._id} month={m} />)
        )}
      </div>
    </div>
  );
}

function MonthCard({ month }: { month: Doc<"close_months"> }) {
  const resolveFlag = useMutation(api.close.resolveFlag);
  const open = month.flags.filter((f) => !f.resolved);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{monthLabel(month.month)}</span>
        {month.closedAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">
            <Check className="h-3 w-3" /> closed
          </span>
        )}
        {month.docPath && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
            title={month.docPath}
          >
            <FileText className="h-3 w-3" /> accountant doc in Files
          </span>
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {month.transactions} transactions
        </span>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Categorized</span>
            <span className="tabular-nums">
              {month.categorized}/{month.transactions}
            </span>
          </div>
          <Bar done={month.categorized} total={month.transactions} />
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Receipts matched</span>
            <span className="tabular-nums">
              {month.receiptsMatched}/{month.receiptsExpected}
            </span>
          </div>
          <Bar done={month.receiptsMatched} total={month.receiptsExpected} />
        </div>
      </div>

      {month.flags.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            For the accountant ({open.length} open)
          </div>
          <ul className="mt-1 space-y-1">
            {month.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.resolved}
                  onChange={(e) =>
                    void resolveFlag({
                      month: month.month,
                      index: i,
                      resolved: e.target.checked,
                    })
                  }
                  className="mt-1"
                />
                <span
                  className={
                    f.resolved ? "text-muted-foreground line-through" : ""
                  }
                >
                  {f.text}
                  {f.merchant && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {f.merchant}
                      {f.date ? `, ${f.date}` : ""}
                      {typeof f.amount === "number"
                        ? `, ${f.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}`
                        : ""}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Rules({ rules }: { rules: Doc<"close_rules">[] }) {
  const remove = useMutation(api.close.removeRule);
  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        No rules yet. Correct a category once and it sticks — the rule appears
        here and your agent applies it forever after.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">When it looks like</th>
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="px-3 py-2 font-semibold">From</th>
            <th className="px-3 py-2 text-right font-semibold">Used</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr
              key={r._id}
              className="group border-b border-border/50 last:border-0"
            >
              <td className="px-3 py-1.5 font-medium">{r.match}</td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {r.category}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">
                {r.origin === "user" ? "your correction" : "agent"}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                {r.timesApplied}
              </td>
              <td className="px-2 text-right">
                <button
                  className="invisible text-muted-foreground/50 hover:text-red-400 group-hover:visible"
                  onClick={() => void remove({ id: r._id })}
                  aria-label={`Remove rule for ${r.match}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
