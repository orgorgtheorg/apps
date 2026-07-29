import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive, HelpCircle, Send, Sliders } from "lucide-react";
import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { Button } from "./components/ui/button";

const BUCKETS = [
  { id: "needsYou", label: "Needs you", hint: "Your judgment required" },
  { id: "handled", label: "Handled", hint: "Routine — drafted or replied" },
  { id: "fyi", label: "FYI", hint: "Categorized and quiet" },
] as const;

type BucketId = (typeof BUCKETS)[number]["id"];

export default function ResponseQueue() {
  const emails = useQuery(api.triage.list);
  const [bucket, setBucket] = useState<BucketId>("needsYou");
  const [showRules, setShowRules] = useState(false);

  const all = (emails ?? []).filter((e) => e.status !== "archived");
  const counts = {
    needsYou: all.filter((e) => e.bucket === "needsYou").length,
    handled: all.filter((e) => e.bucket === "handled").length,
    fyi: all.filter((e) => e.bucket === "fyi").length,
  };
  const rows = all.filter((e) => e.bucket === bucket);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold leading-tight">
              Response queue
            </h1>
            <p className="text-xs text-muted-foreground">
              {counts.needsYou === 0
                ? "Nothing needs you right now"
                : `${counts.needsYou} need${counts.needsYou === 1 ? "s" : ""} your judgment`}
            </p>
          </div>
          <button
            onClick={() => setShowRules((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Sliders className="h-3 w-3" />
            {showRules ? "Hide rules" : "Rules"}
          </button>
        </div>

        <div className="flex rounded-full border border-border p-0.5 text-xs">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              title={b.hint}
              className={`flex-1 rounded-full px-3 py-1 ${
                bucket === b.id
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label} ({counts[b.id]})
            </button>
          ))}
        </div>

        {showRules && <Rules />}

        <p className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          Nothing is ever sent without your approval — except categories where
          you switched auto-send on yourself, in Rules.
        </p>

        {emails === undefined ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-14 text-center text-sm text-muted-foreground">
            Nothing in {BUCKETS.find((b) => b.id === bucket)?.label}.
          </p>
        ) : (
          rows.map((email) => <EmailCard key={email._id} email={email} />)
        )}
      </div>
    </div>
  );
}

function EmailCard({ email }: { email: Doc<"triage_emails"> }) {
  const setStatus = useMutation(api.triage.setStatus);
  const move = useMutation(api.triage.move);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        className="flex w-full flex-wrap items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{email.from}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {email.subject}
        </span>
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {email.category}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(email.receivedAt).toLocaleDateString()}
        </span>
      </button>

      <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
        <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{email.reason}</span>
      </div>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="whitespace-pre-wrap rounded-md bg-secondary/40 p-2 text-sm">
            {email.snippet}
          </p>

          {email.draft ? (
            <div className="rounded-md border border-border/70 p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Drafted reply
              </div>
              <p className="whitespace-pre-wrap text-sm">{email.draft}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/70">
              No reply drafted — this one may not need one.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {email.draft && email.status !== "sent" && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  void setStatus({ id: email._id, status: "approved" })
                }
              >
                <Send className="mr-1 h-3 w-3" /> Approve — agent sends
              </Button>
            )}
            {email.bucket !== "needsYou" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  void move({
                    id: email._id,
                    bucket: "needsYou",
                    reason: "You moved it here",
                  })
                }
              >
                I&apos;ll handle it
              </Button>
            )}
            {email.bucket !== "fyi" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() =>
                  void move({
                    id: email._id,
                    bucket: "fyi",
                    reason: "You moved it to FYI",
                  })
                }
              >
                Just FYI
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() =>
                void setStatus({ id: email._id, status: "archived" })
              }
            >
              <Archive className="mr-1 h-3 w-3" /> Archive
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Rules() {
  const rules = useQuery(api.triage.rules) ?? [];
  const setAutoSend = useMutation(api.triage.setRuleAutoSend);

  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        No rules yet. Tell your agent how you sort mail — &quot;anything from a
        client is Needs-you, newsletters are FYI&quot; — and the rules appear
        here, editable.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Category</th>
            <th className="px-3 py-2 font-semibold">Matches</th>
            <th className="px-3 py-2 font-semibold">Goes to</th>
            <th className="px-3 py-2 font-semibold">Auto-send</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r._id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-1.5 font-medium">{r.name}</td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">
                {r.matches.join(", ")}
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">
                {BUCKETS.find((b) => b.id === r.bucket)?.label ?? r.bucket}
              </td>
              <td className="px-3 py-1.5">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={r.autoSend}
                    onChange={(e) =>
                      void setAutoSend({
                        id: r._id,
                        autoSend: e.target.checked,
                      })
                    }
                  />
                  {r.autoSend ? "on" : "off"}
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
